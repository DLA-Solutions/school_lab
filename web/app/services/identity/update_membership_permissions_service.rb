# frozen_string_literal: true

module Identity
  class UpdateMembershipPermissionsService < ApplicationService
    NON_STAFF_ROLES = %w[guardian backoffice].freeze

    def initialize(membership:, grants: [], denies: [])
      @membership = membership
      @grants = grants
      @denies = denies
    end

    def call
      return ResponseService.failure(code: :not_found) if membership.discarded?
      return ResponseService.failure(code: :validation_error, details: { role: [ "is invalid" ] }) if NON_STAFF_ROLES.include?(membership.role)
      return ResponseService.failure(code: :invalid_state_transition) if membership.suspended?

      staff_profile = membership.staff_profile
      return ResponseService.failure(code: :validation_error, details: { staff_profile: [ "is required" ] }) unless staff_profile&.kept?

      sync_result = SyncMembershipPermissionsService.call(
        membership: membership,
        grants: grants,
        denies: denies
      )
      return sync_result unless sync_result.success?

      reloaded = Membership.includes(staff_profile: :role_template, membership_permissions: []).find(membership.id)
      ResponseService.success(data: reloaded)
    end

    private

    attr_reader :membership, :grants, :denies
  end
end
