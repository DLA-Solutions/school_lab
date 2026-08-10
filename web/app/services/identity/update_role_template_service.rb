# frozen_string_literal: true

module Identity
  class UpdateRoleTemplateService < ApplicationService
    def initialize(template:, params:)
      @template = template
      @params = params
    end

    def call
      if params.key?(:permissions)
        guard_result = guard_admin_capability!
        return guard_result if guard_result.failure?
      end

      ActiveRecord::Base.transaction do
        template.update!(name: params[:name]) if params.key?(:name)
        if params.key?(:permissions)
          sync_result = SyncRoleTemplatePermissionsService.call(
            template: template,
            permissions: params[:permissions]
          )
          raise SyncFailure, sync_result unless sync_result.success?
        end
      end

      ResponseService.success(
        data: {
          template: reload_template,
          affected_memberships_count: template.affected_memberships_count
        }
      )
    rescue ActiveRecord::RecordInvalid => e
      ResponseService.failure(code: :validation_error, details: e.record.errors.to_hash)
    rescue SyncFailure => e
      e.result
    end

    private

    SyncFailure = Class.new(StandardError) do
      attr_reader :result

      def initialize(result)
        @result = result
        super
      end
    end

    attr_reader :template, :params

    def guard_admin_capability!
      proposed_keys = normalize_proposed_keys
      AdminCapableTemplateGuard.call(
        school: template.school,
        template: template,
        proposed_permission_keys: proposed_keys
      )
    end

    def normalize_proposed_keys
      return [] if params[:permissions].blank?

      params[:permissions].map { |entry| entry[:permission_key].to_s }.uniq
    end

    def reload_template
      template.school.school_role_templates
              .includes(:role_template_permissions)
              .find(template.id)
    end
  end
end
