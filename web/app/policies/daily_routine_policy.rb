# frozen_string_literal: true

# Who may read an infantil day card, and who may fill one in.
#
# Reading and writing are different gates. `manage_academic` may read every card in the school,
# drafts included, and may not write — unless that same membership is also role `teacher` with
# a kept teaching assignment on the child, in which case the write is the teacher's, not the
# permission's. A teacher without `manage_academic` reads and writes only the classes they
# currently teach. A guardian reads a sent card for a linked child and never a draft.
#
# Whether the class is infantil is a service failure (`not_infantil`), not a denial here.
# This policy only answers who. The teacher gate is the membership role plus the assignment,
# the same teacher branch Incident uses, not `staff_with?(:teach)`.
class DailyRoutinePolicy < ApplicationPolicy
  def index?
    teacher_role_member? || staff_with?(:manage_academic) || guardian_member?
  end

  def show?
    return false unless record.is_a?(DailyRoutine)
    return false unless record.school_id == school_id

    return true if staff_with?(:manage_academic)
    return true if teacher_role_member? && teaches_student?(record.student)

    guardian_can_read?
  end

  def create?
    writes_routine?
  end

  def update?
    writes_routine?
  end

  def send?
    writes_routine?
  end

  # The controller authorizes either the class (`authorize school_class, :apply_meals?`) or a
  # card. Both mean "this teacher currently teaches that cohort."
  def apply_meals?
    if record.is_a?(SchoolClass)
      apply_meals_to?(record)
    elsif record.is_a?(DailyRoutine)
      writes_routine?
    else
      false
    end
  end

  def apply_meals_to?(school_class)
    assignable_class?(school_class)
  end

  def assignable_student?(student)
    return false unless teacher_role_member?
    return false if student.blank? || student.discarded?
    return false unless student.school_id == school_id

    teaches_student?(student)
  end

  def assignable_class?(school_class)
    return false unless teacher_role_member?
    return false if school_id.blank? || school_class.blank?
    return false unless school_class.school_id == school_id

    teaches_class?(school_class)
  end

  private

  def writes_routine?
    return false unless record.is_a?(DailyRoutine)
    return false unless record.school_id == school_id

    assignable_student?(record.student)
  end

  # A draft is the teacher's unfinished card. The family sees it only after it is sent.
  def guardian_can_read?
    return false unless guardian_member?
    return false unless record.sent?

    linked_guardian?(record.student)
  end

  def linked_guardian?(student)
    return false if student.blank? || student.discarded?

    Current.guardian.student_guardians.kept.exists?(student_id: student.id)
  end

  def teacher_role_member?
    membership = Current.membership
    membership&.role == "teacher" && membership.active?
  end

  def current_teacher
    @current_teacher ||= Current.school&.teachers&.kept&.find_by(email: user&.email)
  end

  def teaches_student?(student)
    return false if student.blank? || student.discarded?

    teaches_class?(student.school_class)
  end

  def teaches_class?(school_class)
    teacher = current_teacher
    return false if teacher.blank? || school_class.blank?

    teacher.teaching_assignments.kept.exists?(school_class_id: school_class.id)
  end

  class Scope < Scope
    def resolve
      return scope.none unless Current.school

      base = scope.where(school_id: Current.school.id)

      # `manage_academic` wins over the teacher narrowing, including when the membership is
      # both. Conversations do the opposite on purpose; routines are the school's record of
      # the day and coordination reads all of them.
      if staff_with?(:manage_academic)
        base
      elsif teacher_role_member?
        assigned_students(base)
      elsif guardian_member?
        base.where(status: "sent", student_id: linked_student_ids)
      else
        scope.none
      end
    end

    private

    def assigned_students(relation)
      teacher = Current.school.teachers.kept.find_by(email: user&.email)
      return relation.none if teacher.blank?

      class_ids = teacher.teaching_assignments.kept.select(:school_class_id)
      student_ids = Student.kept.where(school_id: Current.school.id, school_class_id: class_ids).select(:id)
      relation.where(student_id: student_ids)
    end

    def linked_student_ids
      Student.kept.where(id: Current.guardian.student_guardians.kept.select(:student_id)).select(:id)
    end

    def teacher_role_member?
      membership = Current.membership
      membership&.role == "teacher" && membership.active?
    end

    def guardian_member?
      membership = Current.membership
      membership&.role == "guardian" && membership.active? && Current.guardian.present?
    end
  end
end
