# frozen_string_literal: true

# Who may write a preceptoria report, and who may read one.
#
# `teach` is the key: this is a teacher's account of a student, and the people who hold `teach`
# are teachers and coordination. It is deliberately not `manage_documents` — the secretary who
# files the school's papers has no business writing one, and would not know what to say.
#
# A teacher-role membership is narrowed to students in active teaching assignments. Non-teacher
# staff who hold `teach` and have a matching teacher email record may administer every report in
# the school; creation still resolves the named teacher from that record.
class PreceptorshipReportPolicy < ApplicationPolicy
  def index?
    staff_with?(:teach) || guardian_member?
  end

  def show?
    return staff_scoped? if Current.membership&.staff_member?

    guardian_can_read?
  end

  def create?
    staff_with?(:teach)
  end

  def update?
    staff_scoped? && record.editable?
  end

  def destroy?
    # A draft is a teacher's own working paper and can be thrown away. A published one is the
    # school's record of what a family was told, and deleting it would erase that.
    staff_scoped? && record.editable?
  end

  def publish?
    staff_scoped?
  end

  # The PDF is the report; whoever may read it may print it.
  def pdf?
    show?
  end

  # Whether the actor may start or continue a report about this student.
  def assignable_student?(student)
    return false unless staff_with?(:teach)
    return false if current_teacher.blank?

    !teacher_membership? || teaches_student?(student)
  end

  private

  def staff_scoped?
    return false unless staff_with?(:teach) && record.school_id == school_id

    !teacher_membership? || teaches_student?(record.student)
  end

  # A guardian sees a published report about a child in their care, and nothing else — least of
  # all a draft, which is a teacher's unfinished sentence about somebody's child.
  def guardian_can_read?
    return false unless guardian_member? && record.school_id == school_id
    return false unless record.published?

    Current.guardian.students.kept.exists?(id: record.student_id)
  end

  def teacher_membership?
    Current.membership&.role == "teacher"
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

  class Scope < Scope
    def resolve
      return scope.none unless Current.school

      base = scope.kept.where(school_id: Current.school.id)

      if staff_with?(:teach)
        narrow_staff_scope(base)
      elsif Current.membership&.role == "guardian" && Current.guardian
        base.published.where(student_id: Current.guardian.students.kept.select(:id))
      else
        scope.none
      end
    end

    private

    def narrow_staff_scope(relation)
      return relation unless Current.membership&.role == "teacher"

      teacher = Current.school.teachers.kept.find_by(email: user.email)
      return relation.none if teacher.blank?

      class_ids = teacher.teaching_assignments.kept.select(:school_class_id)
      relation.joins(:student).merge(Student.kept.where(school_class_id: class_ids))
    end
  end
end
