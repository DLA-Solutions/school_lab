# frozen_string_literal: true

# Stable health facts about a collaborator (BC6) — kept current by the teacher themself and read
# by the school at the gate. Mirrors StudentHealthProfilePolicy's split: only the teacher named on
# the row may write it; staff with `manage_people` may read any colleague's profile in the same
# school but must never write on their behalf (BR-CH02).
class TeacherHealthProfilePolicy < ApplicationPolicy
  def show?
    (staff_with?(:manage_people) && same_school?) || own_profile?
  end

  def update?
    own_profile?
  end

  private

  def teacher
    record.is_a?(TeacherHealthProfile) ? record.teacher : record
  end

  def same_school?
    teacher.blank? || teacher.school_id == school_id
  end

  # There is no FK from memberships to teachers — the logged-in teacher's own row is resolved by
  # matching login email against the record's teacher, the same lookup
  # `Current.school.teachers.kept.find_by(email: Current.user.email)` would perform.
  def own_profile?
    return false unless Current.membership&.role == "teacher"
    return false if teacher.blank?
    return false unless teacher.school_id == school_id

    teacher.email == Current.user&.email
  end

  class Scope < Scope
    def resolve
      return scope.none unless Current.school

      scope.where(school_id: Current.school.id)
    end
  end
end
