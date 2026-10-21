# frozen_string_literal: true

# Livro Ata entries (BR-LA02..BR-LA09). Same gate as the books: only a director, coordination or
# secretary membership; school-scoped so another school's ata is a 404 through `policy_scope`.
# Whether an entry can still be edited, sent or cancelled is a lifecycle rule enforced by the
# services (409), not an authorization one.
class MinutesEntryPolicy < ApplicationPolicy
  def index? = minutes_staff?
  def show? = same_school? && minutes_staff?
  def create? = minutes_staff?
  def update? = show?
  def pdf? = show?
  def send_for_signature? = show?
  def cancel? = show?

  class Scope < Scope
    def resolve
      return scope.none unless Current.school && MinutesBookPolicy.minutes_staff?

      scope.kept.where(school_id: Current.school.id)
    end
  end

  private

  def minutes_staff?
    MinutesBookPolicy.minutes_staff?
  end

  def same_school?
    record.school_id == school_id
  end
end
