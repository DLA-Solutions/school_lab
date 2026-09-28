# frozen_string_literal: true

# Health records are written by whoever answers for the child and read by the school. Only the
# family may create, edit, or withdraw them — staff need the list but must not change it.
class StudentHealthRecordPolicy < ApplicationPolicy
  def index?
    return staff_with?(:manage_people) && same_school? if Current.membership&.staff_member?

    guardian_of_the_student?
  end

  def show?
    index?
  end

  def create?
    guardian_of_the_student?
  end

  def update?
    create?
  end

  def destroy?
    create?
  end

  private

  def student
    record.is_a?(StudentHealthRecord) ? record.student : record
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

      scope.kept.where(school_id: Current.school.id)
    end
  end
end
