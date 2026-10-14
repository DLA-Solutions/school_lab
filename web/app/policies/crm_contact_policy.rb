# frozen_string_literal: true

# CRM contacts are prospects the school is courting before enrollment. There is no dedicated CRM
# permission in the catalog yet (no PRD — docs/open-questions.md, "CRM contacts"), so this reuses
# `manage_enrollment`: the key the enrollment desk (director, secretary) already holds. Teachers
# and guardians do not hold it, so they are denied by default.
class CrmContactPolicy < ApplicationPolicy
  def index? = staff_with?(:manage_enrollment)
  def show? = same_school? && staff_with?(:manage_enrollment)
  def create? = staff_with?(:manage_enrollment)
  def update? = show?
  def destroy? = show?

  class Scope < Scope
    def resolve
      return scope.none unless Current.school

      scope.kept.where(school_id: Current.school.id)
    end
  end

  private

  def same_school?
    record.school_id == school_id
  end
end
