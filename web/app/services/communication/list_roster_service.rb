# frozen_string_literal: true

module Communication
  # Children of one class for the family-chat roster. The controller already
  # authorized opening a roster; this decides whether this class is visible and builds the rows.
  class ListRosterService < ApplicationService
    Row = Struct.new(
      :student_id,
      :student_name,
      :school_class_id,
      :conversation_id,
      :sender_line,
      :teacher_id,
      :destinations,
      keyword_init: true
    )

    Destination = Struct.new(:audience, :teacher_id, :name, keyword_init: true)

    def initialize(school:, actor_membership:, school_class_id:)
      @school = school
      @actor_membership = actor_membership
      @school_class_id = school_class_id
    end

    def call
      return failure(:not_found) if school_class.blank?
      return failure(:not_found) unless class_visible?

      ResponseService.success(data: roster_rows)
    end

    private

    attr_reader :school, :actor_membership, :school_class_id

    def roster_rows
      loaded_students.map { |student| row_for(student) }
    end

    def row_for(student)
      conversation = attached_conversation_for(student)
      spoken = conversation&.last_speaker_message

      Row.new(
        student_id: student.id,
        student_name: student.name,
        school_class_id: school_class.id,
        conversation_id: spoken ? conversation.id : nil,
        # Last speaker, including a staff role. The inbox uses the family line instead.
        sender_line: spoken ? conversation.sender_line : nil,
        teacher_id: acting_teacher_id,
        destinations: director? ? director_destinations : nil
      )
    end

    def loaded_students
      return @loaded_students if defined?(@loaded_students)

      @loaded_students = school.students.kept
        .where(school_class_id: school_class.id)
        .preload(:school_class, student_guardians: :guardian)
        .order(:name, :id)
        .to_a
    end

    def attached_conversation_for(student)
      return if director?

      conversations_by_student_id[student.id]
    end

    def conversations_by_student_id
      return @conversations_by_student_id if defined?(@conversations_by_student_id)

      rows = matching_conversations.to_a
      students_by_id = loaded_students.index_by(&:id)
      rows.each do |conversation|
        student = students_by_id[conversation.student_id]
        conversation.association(:student).target = student if student
      end
      Conversation.preload_last_speakers(rows)
      @conversations_by_student_id = rows.index_by(&:student_id)
    end

    def matching_conversations
      base = Conversation.where(school_id: school.id, student_id: loaded_students.map(&:id))

      case actor_kind
      when :teacher
        base.where(audience: "teacher", teacher_id: actor_teacher.id)
      when :secretary
        base.where(audience: "secretary", teacher_id: nil)
      when :coordination
        base.where(audience: "coordination", teacher_id: nil)
      else
        base.none
      end
    end

    def director_destinations
      return @director_destinations if defined?(@director_destinations)

      @director_destinations = [
        destination("coordination"),
        destination("secretary"),
        *class_teachers.map { |teacher| destination("teacher", teacher: teacher) }
      ]
    end

    def class_teachers
      teacher_ids = TeachingAssignment.kept.where(
        school_id: school.id,
        school_class_id: school_class.id
      ).select(:teacher_id)

      school.teachers.kept.where(id: teacher_ids).order(:id)
    end

    # The acting teacher needs their own id before any conversation exists.
    # Secretary and coordination rows stay null; director rows omit the key.
    def acting_teacher_id
      actor_teacher.id if actor_kind == :teacher
    end

    def destination(audience, teacher: nil)
      Destination.new(audience: audience, teacher_id: teacher&.id, name: teacher&.name)
    end

    def class_visible?
      case actor_kind
      when :director, :coordination, :secretary
        true
      when :teacher
        teacher_assigned_to_class?
      else
        false
      end
    end

    def teacher_assigned_to_class?
      teacher = actor_teacher
      return false if teacher.blank?

      TeachingAssignment.kept.exists?(
        school_id: school.id,
        teacher_id: teacher.id,
        school_class_id: school_class.id
      )
    end

    # Leadership is matched before the teacher email, matching SendMessageService#actor_kind:
    # a coordinator who also has a teacher record still sees every class.
    def actor_kind
      return :other if actor_membership.blank?
      return :director if director?
      return :coordination if coordination?
      return :secretary if secretary?
      return :teacher if actor_membership.role == "teacher"

      :other
    end

    def director?
      actor_system_key == "director"
    end

    def coordination?
      actor_system_key == "coordination"
    end

    def secretary?
      actor_system_key == "secretary"
    end

    def actor_system_key
      return @actor_system_key if defined?(@actor_system_key)

      profile = if actor_membership.blank?
        nil
      else
        StaffProfile.kept.find_by(membership_id: actor_membership.id, school_id: school.id)
      end
      template = profile&.role_template
      @actor_system_key = template&.kept? ? template.system_key : nil
    end

    def actor_teacher
      return @actor_teacher if defined?(@actor_teacher)

      email = actor_membership&.user&.email
      @actor_teacher = if email.blank?
        nil
      else
        school.teachers.kept.find_by(email: email)
      end
    end

    def school_class
      return @school_class if defined?(@school_class)

      @school_class = if school_class_id.blank?
        nil
      else
        school.school_classes.kept.find_by(id: school_class_id)
      end
    end

    def failure(code)
      ResponseService.failure(code: code)
    end
  end
end
