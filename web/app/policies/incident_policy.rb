# frozen_string_literal: true

# Who may write an incident ("Ata", BC7), and who may read, approve, or publish one.
#
# `manage_academic` is the broad staff gate here — the role `teach` plays for
# PreceptorshipReportPolicy — and wins over role-based narrowing when both are present (BR-IN03):
# a teacher-role membership is narrowed to students in the teacher's own `teaching_assignments`; a
# `manage_academic`-holding membership (whatever its `role`) sees and creates school-wide. Unlike
# Preceptoria, the teacher branch here is a plain role check rather than a permission check — the
# `teacher` system role template grants `teach`, not `manage_academic`, so BR-IN03's teacher gate
# cannot be expressed as a `staff_with?` call.
#
# `approve?` is a second, independent gate (BR-IN08): the approving membership's
# `staff_profile&.role_template&.system_key` must be exactly "coordination" or "director" —
# `manage_academic` alone never satisfies it, even for staff who hold it (AC-IN05). `publish?` is
# independent of the approval gate and keys off `manage_academic` only — teachers who create
# `staff_only`-default incidents do not get to publish them to guardians.
class IncidentPolicy < ApplicationPolicy
  def index?
    staff_with?(:manage_academic) || teacher_role_member? || guardian_member?
  end

  def show?
    return staff_scoped? if Current.membership&.staff_member?

    guardian_can_read?
  end

  def create?
    staff_with?(:manage_academic) || teacher_role_member?
  end

  # UC-IN05 / AC-IN07 / BR-IN10: exposed publicly (unlike `staff_with?`) so the controller can
  # decide whether the `reported_by_membership_id` list filter should apply at all. A
  # teacher-role request's `policy_scope` already excludes every other staff/teacher's
  # incidents, so that filter must have no effect for them -- not narrow their own list to zero
  # when it names someone else.
  def manage_academic_staff?
    staff_with?(:manage_academic)
  end

  # BR-IN08 / AC-IN05: only a "coordination" or "director" role template fills an approval slot —
  # `manage_academic` is necessary for most academic staff actions but not sufficient here.
  def approve?
    return false unless Current.membership&.staff_member?
    return false unless record.school_id == school_id

    Incident::ROLE_TEMPLATE_APPROVAL_KEYS.include?(approving_role_template_system_key)
  end

  # Publishing to guardians is the same broad permission as school-wide creation — not tied to
  # the approval gate above, and not available to a teacher who merely authored the record.
  def publish?
    staff_with?(:manage_academic) && record.school_id == school_id
  end

  # Whether the actor may create/administer an incident for this student.
  def assignable_student?(student)
    return true if staff_with?(:manage_academic)
    return false unless teacher_role_member?
    return false if current_teacher.blank?

    teaches_student?(student)
  end

  private

  def staff_scoped?
    return false unless record.school_id == school_id
    return false unless staff_with?(:manage_academic) || teacher_role_member?

    staff_with?(:manage_academic) || teaches_student?(record.student)
  end

  # A guardian sees a published, guardian-visible incident about a child in their care, and
  # nothing else — least of all a `staff_only` or still-draft one.
  def guardian_can_read?
    return false unless guardian_member? && record.school_id == school_id
    return false unless record.published? && record.visibility != "staff_only"

    Current.guardian.students.kept.exists?(id: record.student_id)
  end

  def teacher_role_member?
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

  def approving_role_template_system_key
    Current.membership&.staff_profile&.role_template&.system_key
  end

  class Scope < Scope
    def resolve
      return scope.none unless Current.school

      base = scope.where(school_id: Current.school.id)

      if staff_with?(:manage_academic)
        base
      elsif Current.membership&.role == "teacher"
        narrow_staff_scope(base)
      elsif Current.membership&.role == "guardian" && Current.guardian
        base.published.guardian_visible.where(student_id: Current.guardian.students.kept.select(:id))
      else
        scope.none
      end
    end

    private

    def narrow_staff_scope(relation)
      teacher = Current.school.teachers.kept.find_by(email: user.email)
      return relation.none if teacher.blank?

      class_ids = teacher.teaching_assignments.kept.select(:school_class_id)
      relation.joins(:student).merge(Student.kept.where(school_class_id: class_ids))
    end
  end
end
