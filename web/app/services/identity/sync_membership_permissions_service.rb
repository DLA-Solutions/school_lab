# frozen_string_literal: true

module Identity
  class SyncMembershipPermissionsService < ApplicationService
    def initialize(membership:, grants: [], denies: [])
      @membership = membership
      @grants = Array(grants).map(&:to_s)
      @denies = Array(denies).map(&:to_s)
    end

    def call
      overlap = grants & denies
      if overlap.any?
        return ResponseService.failure(
          code: :validation_error,
          details: { permissions: [ "contains keys in both grants and denies" ] }
        )
      end

      unknown = (grants + denies).reject { |key| SchoolLab::Permissions.known_key?(key) }
      if unknown.any?
        return ResponseService.failure(
          code: :validation_error,
          details: { permission_key: [ "is invalid" ] }
        )
      end

      (grants + denies).each do |key|
        validation = ValidatePermissionForRoleService.call(membership: membership, permission_key: key)
        return validation unless validation.success?
      end

      ActiveRecord::Base.transaction do
        sync_overrides!
      end

      ResponseService.success(data: membership)
    rescue ActiveRecord::RecordInvalid => e
      ResponseService.failure(code: :validation_error, details: e.record.errors.to_hash)
    end

    private

    attr_reader :membership, :grants, :denies

    def sync_overrides!
      desired = grants.index_with { "grant" }.merge(denies.index_with { "deny" })

      membership.membership_permissions.kept
                  .where.not(permission_key: desired.keys)
                  .find_each(&:discard)

      desired.each do |permission_key, effect|
        upsert_override!(permission_key, effect)
      end
    end

    def upsert_override!(permission_key, effect)
      existing = membership.membership_permissions.kept.find_by(permission_key: permission_key)
      if existing
        existing.update!(effect: effect) if existing.effect != effect
        return
      end

      discarded = membership.membership_permissions.discarded.find_by(permission_key: permission_key)
      if discarded
        discarded.undiscard
        discarded.update!(effect: effect)
        return
      end

      membership.membership_permissions.create!(
        school: membership.school,
        permission_key: permission_key,
        effect: effect
      )
    end
  end
end
