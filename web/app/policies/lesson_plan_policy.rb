# frozen_string_literal: true

# Who may write a lesson plan, and who may read one. BR-LP02: only the class_discipline's
# assigned teacher, or staff holding manage_academic, may create/update. Reads are the same two
# groups — a teacher sees only their own class_discipline rows' plans; manage_academic staff see
# every plan in the school (BR-LP06). No approval workflow (BR-LP05) — create and update allow
# the same thing, since the upsert endpoint is idempotent create-or-update.
class LessonPlanPolicy < ApplicationPolicy
  def index?
    teacher_membership? || staff_with?(:manage_academic)
  end

  def show?
    staff_scoped?
  end

  def create?
    staff_scoped?
  end

  def update?
    staff_scoped?
  end

  class Scope < Scope
    def resolve
      return scope.none unless Current.school

      base = scope.joins(:class_discipline).merge(ClassDiscipline.where(school_id: Current.school.id))

      if staff_with?(:manage_academic)
        base
      elsif teacher_membership?
        teacher = current_teacher
        return scope.none if teacher.blank?

        base.merge(ClassDiscipline.where(teacher_id: teacher.id))
      else
        scope.none
      end
    end

    private

    def teacher_membership?
      Current.membership&.active? && Current.membership.role == "teacher"
    end

    def current_teacher
      Current.school&.teachers&.kept&.find_by(email: user&.email)
    end
  end

  private

  def staff_scoped?
    return false unless record.class_discipline&.school_id == school_id
    return true if staff_with?(:manage_academic)
    return false unless teacher_membership?

    teacher = current_teacher
    return false if teacher.blank?

    record.class_discipline.teacher_id == teacher.id
  end

  def teacher_membership?
    Current.membership&.active? && Current.membership.role == "teacher"
  end

  def current_teacher
    @current_teacher ||= Current.school&.teachers&.kept&.find_by(email: user&.email)
  end
end
