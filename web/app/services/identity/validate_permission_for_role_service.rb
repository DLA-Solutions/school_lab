# frozen_string_literal: true

module Identity
  class ValidatePermissionForRoleService < ApplicationService
    def initialize(membership:, permission_key:)
      @membership = membership
      @permission_key = permission_key.to_s
    end

    def call
      return ResponseService.failure(code: :validation_error) unless SchoolLab::Permissions.known_key?(permission_key)

      required_role = SchoolLab::Permissions::CATALOG[permission_key][:requires_also_teaches_when_role]
      if required_role.present? && membership.role == required_role
        staff_profile = membership.staff_profile
        unless staff_profile&.kept? && staff_profile.also_teaches?
          return ResponseService.failure(code: :invalid_permission_for_role)
        end
      end

      ResponseService.success
    end

    private

    attr_reader :membership, :permission_key
  end
end
