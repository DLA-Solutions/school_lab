# frozen_string_literal: true

class SchoolPolicy < ApplicationPolicy
  STAFF_ADMIN_ROLES = %w[school staff].freeze

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

  def handoff?
    return provisioning_handoff? if record.provisioning?
    return activation_handoff? if record.pending_handoff?

    false
  end

  class Scope < Scope
    def resolve
      return scope.all if user&.backoffice?
      return scope.none unless user

      # A school admin sees the schools they administer, never the whole register.
      scope.where(id: user.memberships.kept.where(role: STAFF_ADMIN_ROLES).select(:school_id))
    end
  end

  private

  def school_admin?
    user&.memberships&.kept&.exists?(role: STAFF_ADMIN_ROLES, status: "active")
  end

  def member_of_record?
    return false unless user && record.respond_to?(:id)

    user.memberships.kept.exists?(school_id: record.id, role: STAFF_ADMIN_ROLES, status: "active")
  end

  def provisioning_handoff?
    backoffice? && platform_with?(:provision_school) && record.provisioning?
  end

  def activation_handoff?
    return school_owner? && record.self_serve? if record.self_serve?

    (backoffice? && platform_with?(:provision_school)) || school_owner?
  end
end
