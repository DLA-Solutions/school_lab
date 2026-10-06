# frozen_string_literal: true

# Family chat visibility. A row is visible from the actor's role, a kept guardian link, or a
# kept teaching assignment on the child's current class — nothing is stored as a participant.
# Coordination and director are matched before the teacher email, so a coordinator who also
# has a teacher record still sees every audience.
class ConversationPolicy < ApplicationPolicy
  module Access
    private

    def active_kept_in_school?
      membership = Current.membership
      school = Current.school
      return false unless membership&.active? && membership.kept?
      return false if school.blank?

      membership.school_id == school.id
    end

    def guardian_role?
      Current.membership&.role == "guardian"
    end

    def teacher_role?
      Current.membership&.role == "teacher"
    end

    def system_key
      membership = Current.membership
      school = Current.school
      return if membership.blank? || school.blank?

      profile = StaffProfile.kept.find_by(membership_id: membership.id, school_id: school.id)
      template = profile&.role_template
      return unless template&.kept?

      template.system_key
    end

    def secretary?
      system_key == "secretary"
    end

    def leadership?
      system_key.in?(%w[coordination director])
    end

    def current_teacher
      return if user.blank? || user.email.blank? || Current.school.blank?

      Current.school.teachers.kept.find_by(email: user.email)
    end
  end

  include Access

  def index?
    inbox_actor?
  end

  def show?
    return false unless record.is_a?(Conversation) && record.id.present?

    Scope.new(user, Conversation.where(id: record.id)).resolve.exists?
  end

  def destinations?
    active_kept_in_school? && guardian_role?
  end

  def roster?
    active_kept_in_school? && (teacher_role? || secretary? || leadership?)
  end

  def create?
    false
  end

  class Scope < Scope
    include Access

    def resolve
      return scope.none if Current.school.blank?
      return scope.none unless active_kept_in_school?

      base = scope.where(school_id: Current.school.id)

      if leadership?
        base
      elsif secretary?
        base.where(audience: "secretary")
      elsif teacher_role?
        teacher_conversations(base)
      elsif guardian_role?
        guardian_conversations(base)
      else
        scope.none
      end
    end

    private

    def teacher_conversations(relation)
      teacher = current_teacher
      return relation.none if teacher.blank?

      class_ids = teacher.teaching_assignments.kept.select(:school_class_id)
      relation
        .where(audience: "teacher", teacher_id: teacher.id)
        .joins(:student)
        .where(students: { school_class_id: class_ids })
    end

    def guardian_conversations(relation)
      return relation.none if user.blank?

      relation.where(student_id: linked_student_ids)
    end

    def linked_student_ids
      guardian_ids = Guardian.kept.where(school_id: Current.school.id, user_id: user.id).select(:id)

      StudentGuardian.kept.where(school_id: Current.school.id, guardian_id: guardian_ids).select(:student_id)
    end
  end

  private

  def inbox_actor?
    return false unless active_kept_in_school?

    guardian_role? || secretary? || teacher_role? || leadership?
  end
end
