# frozen_string_literal: true

# The health profile is written by whoever answers for the child and read by the school. Only the
# family may keep it current — staff need it at the gate but must not add facts on their behalf.
class StudentHealthProfilePolicy < ApplicationPolicy
  def show?
    return staff_with?(:manage_people) && same_school? if Current.membership&.staff_member?

    guardian_of_the_student?
  end

  def update?
    guardian_of_the_student?
  end

  private

  def student
    record.is_a?(StudentHealthProfile) ? record.student : record
  end

  def same_school?
    student.blank? || student.school_id == school_id
  end

  def guardian_of_the_student?
    return false unless Current.membership&.role == "guardian" && Current.guardian
    return false if student.blank?
    return false unless student.school_id == school_id

    Current.guardian.students.kept.exists?(id: student.id)
  end

  class Scope < Scope
    def resolve
      return scope.none unless Current.school

      scope.where(school_id: Current.school.id)
    end
  end
end
