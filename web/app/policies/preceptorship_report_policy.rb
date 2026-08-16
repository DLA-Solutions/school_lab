# frozen_string_literal: true

# Who may write a preceptoria report, and who may read one.
#
# `teach` is the key: this is a teacher's account of a student, and the people who hold `teach`
# are teachers and coordination. It is deliberately not `manage_documents` — the secretary who
# files the school's papers has no business writing one, and would not know what to say.
#
# The narrowing to a teacher's own students is not here but in the controller, alongside the same
# check the mark sheet makes: the permission says who may write, the roll says about whom.
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

  private

  def staff_scoped?
    staff_with?(:teach) && record.school_id == school_id
  end

  # A guardian sees a published report about a child in their care, and nothing else — least of
  # all a draft, which is a teacher's unfinished sentence about somebody's child.
  def guardian_can_read?
    return false unless guardian_member? && record.school_id == school_id
    return false unless record.published?

    Current.guardian.students.kept.exists?(id: record.student_id)
  end

  class Scope < Scope
    def resolve
      return scope.none unless Current.school

      base = scope.kept.where(school_id: Current.school.id)

      if staff_with?(:teach)
        base
      elsif Current.membership&.role == "guardian" && Current.guardian
        base.published.where(student_id: Current.guardian.students.kept.select(:id))
      else
        scope.none
      end
    end
  end
end
