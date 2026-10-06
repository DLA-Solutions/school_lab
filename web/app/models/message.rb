# frozen_string_literal: true

# Immutable line in a family chat. A correction is another row; this one is not edited or discarded.
class Message < ApplicationRecord
  include SchoolAuditable

  belongs_to :conversation
  belongs_to :school
  belongs_to :sender_membership, class_name: "Membership"

  validates :body, presence: true
  validates :sent_at, presence: true
  validate :parties_belong_to_the_same_school

  scope :chronological, -> { order(sent_at: :asc) }

  # "Diego, pai da Lara — 1º ano" for a linked guardian. Staff is the role, or the teacher name,
  # then the same child and grade. Product words come from the locale.
  def sender_line
    student = conversation&.student
    return sender_membership&.user&.email.to_s if student.blank?

    link = guardian_link_for(student)
    if link
      I18n.t(
        "communication.sender_line",
        guardian: link.guardian.name,
        relationship: relationship_label(link.relationship),
        student: student.name,
        series: series_label(student)
      )
    else
      I18n.t(
        "communication.staff_sender_line",
        speaker: staff_speaker,
        student: student.name,
        series: series_label(student)
      )
    end
  end

  def teacher_on_file=(teacher)
    @teacher_on_file = teacher
  end

  private

  def guardian_link_for(student)
    user_id = sender_membership&.user_id
    return if user_id.blank?

    student.student_guardians
      .select { |link| link.kept? && link.guardian&.kept? && link.guardian.user_id == user_id }
      .min_by(&:id)
  end

  def relationship_label(relationship)
    I18n.t(
      "communication.relationships.#{relationship}",
      default: I18n.t("communication.relationships.other")
    )
  end

  def series_label(student)
    grade_level = student.school_class&.grade_level
    SchoolClass::GRADE_LABELS.dig(grade_level, 1).presence || grade_level.to_s
  end

  # Office roles name the desk. A teacher is named as a person. Anything else stays a teacher line
  # rather than an e-mail address.
  def staff_speaker
    system_key = kept_staff_profile&.role_template&.system_key.to_s
    if %w[coordination secretary director].include?(system_key)
      return I18n.t("communication.roles.#{system_key}")
    end

    teacher_on_file&.name.presence || I18n.t("communication.roles.teacher")
  end

  def kept_staff_profile
    profile = sender_membership&.staff_profile
    profile if profile&.kept?
  end

  def teacher_on_file
    return @teacher_on_file if instance_variable_defined?(:@teacher_on_file)

    email = sender_membership&.user&.email
    @teacher_on_file = school.teachers.kept.find_by(email: email) if email.present?
  end

  def parties_belong_to_the_same_school
    return if school_id.blank?

    errors.add(:conversation, :invalid) if conversation && conversation.school_id != school_id
    errors.add(:sender_membership, :invalid) if sender_membership && sender_membership.school_id != school_id
  end
end
