# frozen_string_literal: true

module Identity
  class ResolveEffectivePermissionsService < ApplicationService
    STAFF_ROLES = %w[school staff teacher].freeze
    NON_STAFF_ROLES = %w[guardian backoffice].freeze

    def initialize(membership:)
      @membership = membership
    end

    def call
      return empty_success if membership.blank? || membership.discarded?

      if NON_STAFF_ROLES.include?(membership.role)
        return empty_success
      end

      unless STAFF_ROLES.include?(membership.role)
        return empty_success
      end

      staff_profile = membership.staff_profile
      return empty_success unless staff_profile&.kept?

      overrides = membership.membership_permissions.kept.to_a

      if staff_profile.is_owner?
        resolve_owner(staff_profile, overrides)
      else
        resolve_template(staff_profile, overrides)
      end
    rescue StandardError
      empty_success
    end

    def self.allows?(membership:, permission_key:)
      result = call(membership: membership)
      result.success? && result.data[:keys].include?(permission_key.to_s)
    end

    private

    attr_reader :membership

    def empty_success
      ResponseService.success(data: { keys: [], sources: {} })
    end

    def grant_keys(overrides)
      overrides.select { |override| override.effect == "grant" }.map(&:permission_key)
    end

    def deny_keys(overrides)
      overrides.select { |override| override.effect == "deny" }.map(&:permission_key)
    end

    def apply_teach_gate!(sources, staff_profile, grant_keys_list)
      return if membership.role == "teacher" || staff_profile.also_teaches?

      if grant_keys_list.include?("teach")
        sources["teach"] = "grant"
      else
        sources.delete("teach")
      end
    end

    def apply_overrides!(sources, overrides)
      overrides.each do |override|
        key = override.permission_key

        if override.effect == "grant"
          sources[key] = "grant" unless sources.key?(key)
        elsif override.effect == "deny"
          sources.delete(key)
        end
      end
    end

    def resolve_owner(staff_profile, overrides)
      sources = SchoolLab::Permissions.staff_keys.index_with { |_key| "owner" }
      grant_keys_list = grant_keys(overrides)

      apply_teach_gate!(sources, staff_profile, grant_keys_list)
      apply_overrides!(sources, overrides)

      ResponseService.success(data: build_result(sources))
    end

    def resolve_template(staff_profile, overrides)
      sources = {}

      staff_profile.role_template.role_template_permissions.kept.each do |permission|
        sources[permission.permission_key] = "template"
      end

      grant_keys_list = grant_keys(overrides)

      grant_keys_list.each do |key|
        sources[key] = "grant" unless sources.key?(key)
      end

      deny_keys(overrides).each do |key|
        sources.delete(key)
      end

      apply_teach_gate!(sources, staff_profile, grant_keys_list)

      ResponseService.success(data: build_result(sources))
    end

    def build_result(sources)
      { keys: sources.keys.sort, sources: sources }
    end
  end
end
