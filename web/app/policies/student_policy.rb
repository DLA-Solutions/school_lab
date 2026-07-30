# frozen_string_literal: true

class StudentPolicy < ApplicationPolicy
  def index?
    school_staff? || guardian_member?
  end

  def show?
    return school_staff? && record.school_id == school_id if school_staff?

    guardian_member? && guardian_linked_student?
  end

  def create?
    school_staff?
  end

  def update?
    school_staff? && record.school_id == school_id
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
            .where(student_guardians: { guardian_id: Current.guardian.id })
            .distinct
      elsif Current.membership&.role == "school" && Current.membership&.active?
        base
      else
        scope.none
      end
    end
  end
end
