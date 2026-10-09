# frozen_string_literal: true

class StudentPolicy < ApplicationPolicy
  def index?
    staff_with?(:manage_people) || guardian_member?
  end

  def show?
    return staff_with?(:manage_people) && record.school_id == school_id if Current.membership&.staff_member?

    guardian_member? && guardian_linked_student?
  end

  def create?
    staff_with?(:manage_people)
  end

  def update?
    staff_with?(:manage_people) && record.school_id == school_id
  end

  def destroy?
    update?
  end

  private

  def guardian_linked_student?
    record.school_id == school_id &&
      Current.guardian.students.kept.exists?(id: record.id)
  end

  class Scope < Scope
    def resolve
      return scope.none unless Current.school

      base = scope.kept.where(school_id: Current.school.id)

      if Current.membership&.role == "guardian" && Current.guardian
        base.joins(:student_guardians)
            .merge(StudentGuardian.kept)
            .where(student_guardians: { guardian_id: Current.guardian.id })
            .distinct
      elsif staff_with?(:manage_people)
        base
      else
        scope.none
      end
    end
  end
end
