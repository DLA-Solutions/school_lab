# frozen_string_literal: true

module Communication
  # Posts one line into the child's conversation with a destination and writes in-app bell
  # rows for everyone who can see that conversation, except the sender.
  class SendMessageService < ApplicationService
    def initialize(school:, actor_membership:, student_id:, audience:, teacher_id: nil, body:)
      @school = school
      @actor_membership = actor_membership
      @student_id = student_id
      @audience = audience.to_s
      @teacher_id = teacher_id
      @body = body
    end

    def call
      return failure(:empty_content) if stripped_body.blank?
      return failure(:not_found) if student.blank?
      return failure(:not_found) unless destination_allowed?
      return failure(:teacher_not_assigned) if teacher_audience? && !teacher_assigned?

      persist_message
    end

    private

    attr_reader :school, :actor_membership, :student_id, :audience, :teacher_id, :body

    def persist_message
      conversation = nil
      message = nil

      ActiveRecord::Base.transaction do
        conversation = find_or_create_conversation!
        sent_at = Time.current
        message = Message.create!(
          conversation: conversation,
          school: school,
          sender_membership: actor_membership,
          body: stripped_body,
          sent_at: sent_at
        )
        conversation.update!(last_message_at: sent_at)
        create_bell_rows(conversation)
      end

      ResponseService.success(data: { conversation: conversation, message: message })
    end

    def find_or_create_conversation!
      existing = find_conversation
      return existing if existing

      ActiveRecord::Base.transaction(requires_new: true) do
        Conversation.create!(
          school: school,
          student: student,
          audience: audience,
          teacher: teacher_audience? ? resolved_teacher : nil
        )
      end
    rescue ActiveRecord::RecordNotUnique
      find_conversation
    end

    def find_conversation
      if teacher_audience?
        Conversation.find_by(
          school_id: school.id,
          student_id: student.id,
          audience: "teacher",
          teacher_id: resolved_teacher.id
        )
      else
        Conversation.find_by(
          school_id: school.id,
          student_id: student.id,
          audience: audience,
          teacher_id: nil
        )
      end
    end

    def create_bell_rows(conversation)
      title = I18n.t("notifications.message.title")
      bell_body = I18n.t("notifications.message.body", student: student.name)

      recipient_users.each do |user|
        Notification.create!(
          user: user,
          school: school,
          conversation: conversation,
          kind: "message",
          title: title,
          body: bell_body
        )
      end
    end

    # Coordination and director see every audience, so they are rung on every send.
    # Secretary only for secretary. The named teacher only while assigned to the current class.
    def recipient_users
      users = linked_guardian_users
      users.concat(staff_users_for("secretary")) if audience == "secretary"
      users << named_teacher_user if teacher_audience?
      users.concat(staff_users_for("coordination"))
      users.concat(staff_users_for("director"))

      sender_id = actor_membership.user_id
      users.compact.uniq(&:id).reject { |user| user.id == sender_id }
    end

    def linked_guardian_users
      student.student_guardians.kept
        .where(school_id: school.id)
        .joins(:guardian)
        .merge(Guardian.kept)
        .where.not(guardians: { user_id: nil })
        .includes(guardian: :user)
        .filter_map { |link| link.guardian.user }
    end

    def staff_users_for(system_key)
      Membership.active
        .where(school_id: school.id)
        .joins(staff_profile: :role_template)
        .merge(StaffProfile.kept)
        .merge(SchoolRoleTemplate.kept)
        .where(school_role_templates: { system_key: system_key })
        .includes(:user)
        .filter_map(&:user)
    end

    def named_teacher_user
      teacher = resolved_teacher
      return if teacher.blank? || teacher.email.blank?
      return unless teacher_assigned?

      user = User.kept.find_by(email: teacher.email)
      return if user.blank?
      return unless Membership.active.exists?(school_id: school.id, user_id: user.id)

      user
    end

    def destination_allowed?
      return false unless actor_in_school?
      return false unless Conversation::AUDIENCES.include?(audience)

      case actor_kind
      when :leadership
        true
      when :secretary
        audience == "secretary"
      when :teacher
        own_teacher_destination?
      when :guardian
        linked_guardian?
      else
        false
      end
    end

    # Leadership is matched before the teacher email, matching conversation visibility:
    # a coordinator who also has a teacher record may still address every audience.
    def actor_kind
      return :leadership if leadership?
      return :secretary if secretary?
      return :teacher if actor_membership.role == "teacher"
      return :guardian if actor_membership.role == "guardian"

      :other
    end

    def actor_in_school?
      actor_membership.present? &&
        actor_membership.kept? &&
        actor_membership.active? &&
        actor_membership.school_id == school.id
    end

    def leadership?
      actor_system_key.in?(%w[coordination director])
    end

    def secretary?
      actor_system_key == "secretary"
    end

    def actor_system_key
      return @actor_system_key if defined?(@actor_system_key)

      profile = StaffProfile.kept.find_by(membership_id: actor_membership.id, school_id: school.id)
      template = profile&.role_template
      @actor_system_key = template&.kept? ? template.system_key : nil
    end

    def own_teacher_destination?
      return false unless teacher_audience?

      teacher = actor_teacher
      return false if teacher.blank?

      teacher.id.to_s == teacher_id.to_s
    end

    def actor_teacher
      email = actor_membership.user&.email
      return if email.blank?

      school.teachers.kept.find_by(email: email)
    end

    def linked_guardian?
      user_id = actor_membership.user_id
      return false if user_id.blank?

      student.student_guardians.kept
        .where(school_id: school.id)
        .joins(:guardian)
        .merge(Guardian.kept)
        .exists?(guardians: { user_id: user_id })
    end

    def teacher_assigned?
      teacher = resolved_teacher
      return false if teacher.blank? || student.school_class_id.blank?

      TeachingAssignment.kept.exists?(
        school_id: school.id,
        teacher_id: teacher.id,
        school_class_id: student.school_class_id
      )
    end

    def resolved_teacher
      return @resolved_teacher if defined?(@resolved_teacher)

      @resolved_teacher = school.teachers.kept.find_by(id: teacher_id)
    end

    def student
      return @student if defined?(@student)

      @student = school.students.kept.find_by(id: student_id)
    end

    def teacher_audience?
      audience == "teacher"
    end

    def stripped_body
      body.to_s.strip
    end

    def failure(code)
      ResponseService.failure(code: code)
    end
  end
end
