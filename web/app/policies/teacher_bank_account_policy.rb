# frozen_string_literal: true

# Where a collaborator's salary is sent. Read and written by the people who keep the
# collaborator's register — the same `manage_people` that lets somebody open the collaborator at
# all, since a payment route nobody may see is a payment nobody can make.
class TeacherBankAccountPolicy < ApplicationPolicy
  def show?
    staff_with?(:manage_people) && same_school?
  end

  def update?
    show?
  end

  private

  def teacher
    record.is_a?(TeacherBankAccount) ? record.teacher : record
  end

  def same_school?
    teacher.school_id == school_id
  end
end
