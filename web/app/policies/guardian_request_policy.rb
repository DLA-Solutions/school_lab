# frozen_string_literal: true

# Two readers with different rights over the same table. Staff who look after the school's papers
# work the whole queue; a guardian sees what they themselves asked for, and nothing else.
#
# The permission is `manage_documents` rather than one of its own: a declaration is a document the
# school issues, and the desk that holds the archive is the desk that answers these.
class GuardianRequestPolicy < ApplicationPolicy
  def index?
    staff_with?(:manage_documents) || guardian_member?
  end

  def show?
    return staff_scoped? if Current.membership&.staff_member?

    own_request?
  end

  # A guardian opens their own; staff open one on behalf of a guardian who telephoned.
  def create?
    staff_with?(:manage_documents) || guardian_member?
  end

  # Answering a request is the school's to do, never the guardian's — a guardian who could mark
  # their own request fulfilled would be marking the school's work done for it.
  def update?
    staff_with?(:manage_documents) && record.school_id == school_id
  end

  def destroy?
    update?
  end

  def start?
    update?
  end

  def release?
    update?
  end

  def fulfill?
    update?
  end

  def reject?
    update?
  end

  private

  def staff_scoped?
    staff_with?(:manage_documents) && record.school_id == school_id
  end

  def own_request?
    guardian_member? &&
      record.school_id == school_id &&
      record.guardian_id == Current.guardian.id
  end

  class Scope < Scope
    def resolve
      return scope.none unless Current.school

      base = scope.kept.where(school_id: Current.school.id)

      if staff_with?(:manage_documents)
        base
      elsif Current.membership&.role == "guardian" && Current.guardian
        base.where(guardian_id: Current.guardian.id)
      else
        scope.none
      end
    end
  end
end
