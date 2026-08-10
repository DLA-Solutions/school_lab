# frozen_string_literal: true

module Identity
  class CreateRoleTemplateService < ApplicationService
    def initialize(school:, params:)
      @school = school
      @params = params
    end

    def call
      template = school.school_role_templates.build(
        name: params[:name],
        is_system: false,
        system_key: nil
      )

      ActiveRecord::Base.transaction do
        template.save!
        sync_result = SyncRoleTemplatePermissionsService.call(
          template: template,
          permissions: params[:permissions]
        )
        raise SyncFailure, sync_result unless sync_result.success?
      end

      ResponseService.success(data: reload_template(template))
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

    attr_reader :school, :params

    def reload_template(template)
      school.school_role_templates
            .includes(:role_template_permissions)
            .find(template.id)
    end
  end
end
