# frozen_string_literal: true

# Who may write a daily routine entry (BC11, "Rotina Infantil"), and who may read it.
#
# BR-DR07: only a teacher with a TeachingAssignment to the student's school_class, or staff
# holding manage_academic, may create/update/send. BR-DR06: a guardian may only read `sent`
# entries about their own linked children — never a draft, never another family's. One policy
# class covers all three actors, same shape as IncidentPolicy (staff/teacher branch +
# guardian_member? branch) rather than splitting guardian access into a second policy class —
# there is no separate guardian policy precedent for this kind of record in this codebase.
class DailyRoutineEntryPolicy < ApplicationPolicy
  def index?
    teacher_membership? || staff_with?(:manage_academic) || guardian_member?
  end

  def show?
    return staff_scoped? if Current.membership&.staff_member?

    guardian_can_read?
  end

  def create?
    assignable_student?(record.student)
  end

  def update?
    staff_scoped?
  end

  def send?
    staff_scoped?
  end

  # Whether the actor may create/update/send an entry for this student (BR-DR07).
  def assignable_student?(student)
    return false if student.blank?
    return true if staff_with?(:manage_academic)
    return false unless teacher_membership?
    return false if current_teacher.blank?

    teaches_student?(student)
  end

  class Scope < Scope
    def resolve
      return scope.none unless Current.school

      base = scope.where(school_id: Current.school.id)

      if staff_with?(:manage_academic)
        base
      elsif Current.membership&.role == "teacher"
        narrow_to_teacher(base)
      elsif Current.membership&.role == "guardian" && Current.guardian
        base.where(status: "sent").where(student_id: Current.guardian.students.kept.select(:id))
      else
        scope.none
      end
    end

    private

    def narrow_to_teacher(relation)
      teacher = Current.school.teachers.kept.find_by(email: user.email)
      return relation.none if teacher.blank?

      class_ids = teacher.teaching_assignments.kept.select(:school_class_id)
      relation.joins(:student).merge(Student.kept.where(school_class_id: class_ids))
    end
  end

  private

  def staff_scoped?
    return false unless record.school_id == school_id
    return true if staff_with?(:manage_academic)
    return false unless teacher_membership?
    return false if current_teacher.blank?

    teaches_student?(record.student)
  end

  # A guardian reads a `sent` entry about a child in their care, and nothing else — a draft
  # never surfaces to a family, same rigor as IncidentPolicy's published-only guardian read.
  def guardian_can_read?
    return false unless guardian_member? && record.school_id == school_id
    return false unless record.sent?

    Current.guardian.students.kept.exists?(id: record.student_id)
  end

  def teacher_membership?
    Current.membership&.role == "teacher" && Current.membership&.active?
  end

  def current_teacher
    @current_teacher ||= Current.school&.teachers&.kept&.find_by(email: user&.email)
  end

  def teaches_student?(student)
    teacher = current_teacher
    return false if teacher.blank?
    return false if student.school_class_id.blank?

    teacher.teaching_assignments.kept.exists?(school_class_id: student.school_class_id)
  end
end
