# frozen_string_literal: true

# The health sheet is written by whoever answers for the child and read by the school. Both may
# keep it current: a family updates an allergy from home, and the front desk writes down what a
# parent said at the counter. The record carries who wrote it last, so a note is always
# attributable even though two kinds of people can write it.
class StudentHealthRecordPolicy < ApplicationPolicy
  def show?
    return staff_with?(:manage_people) && same_school? if Current.membership&.staff_member?

    guardian_of_the_student?
  end

  def update?
    show?
  end

  private

  def student
    record.is_a?(StudentHealthRecord) ? record.student : record
  end

  def same_school?
    student.school_id == school_id
  end

  def guardian_of_the_student?
    return false unless Current.membership&.role == "guardian" && Current.guardian
    return false unless same_school?

    Current.guardian.students.kept.exists?(id: student.id)
  end
end
