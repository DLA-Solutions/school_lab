# frozen_string_literal: true

# Who may collect a child is the family's call, so only they write the list. The school reads it —
# it is staff at the gate who need it — but adding somebody to it on the family's behalf is the
# one thing this list must not allow.
class AuthorizedPickupPolicy < ApplicationPolicy
  def index?
    return staff_with?(:manage_people) && same_school? if Current.membership&.staff_member?

    guardian_of_the_student?
  end

  def show?
    index?
  end

  # The family authorises; the school does not. A staff member who added a name here could let a
  # stranger through the gate with the record saying it was allowed all along.
  def create?
    guardian_of_the_student?
  end

  def destroy?
    create?
  end

  private

  def student
    record.is_a?(AuthorizedPickup) ? record.student : record
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
