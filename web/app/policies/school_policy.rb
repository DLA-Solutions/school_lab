# frozen_string_literal: true

class SchoolPolicy < ApplicationPolicy
  def index?
    backoffice? || school_admin?
  end

  def show?
    backoffice? || member_of_record?
  end

  # A school admin may open a new school — they become its first member. Backoffice keeps the
  # unrestricted view.
  def create?
    backoffice? || school_admin?
  end

  # Editing and removing stay tied to membership: opening the register to school admins must not
  # let one school's administrator rename or discard another's.
  def update?
    backoffice? || member_of_record?
  end

  def destroy?
    update?
  end

  class Scope < Scope
    def resolve
      return scope.all if user&.backoffice?
      return scope.none unless user

      # A school admin sees the schools they administer, never the whole register.
      scope.where(id: user.memberships.kept.where(role: "school").select(:school_id))
    end
  end

  private

  def school_admin?
    user&.memberships&.kept&.exists?(role: "school", status: "active")
  end

  def member_of_record?
    return false unless user && record.respond_to?(:id)

    user.memberships.kept.exists?(school_id: record.id, role: "school", status: "active")
  end
end
