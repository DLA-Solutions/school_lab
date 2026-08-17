# frozen_string_literal: true

module Billing
  class UpdateTaxDeclarationSettingsService < ApplicationService
    def initialize(school:, params:, actor:)
      @school = school
      @params = params
      @actor = actor
    end

    def call
      settings = TaxDeclarationSetting.for(school)
      changed = assign_settings(settings)
      settings.configuration_version += 1 if changed && settings.approved_purpose_configuration_digest.present?

      unless settings.save
        return ResponseService.failure(code: :validation_error, details: settings.errors.to_hash)
      end

      if acknowledge_legal_ownership?
        approval_result = ApprovePurposeConfigurationService.call(school: school, actor: actor)
        return approval_result if approval_result.failure?

        settings.reload
      end

      ResponseService.success(data: settings)
    end

    private

    attr_reader :school, :params, :actor

    def assign_settings(settings)
      changed = false

      %i[legal_text legal_text_version document_signatory_id].each do |key|
        next unless params.key?(key)

        new_value = params[key]
        new_value = new_value.presence if key == :document_signatory_id
        next if settings.public_send(key) == new_value

        settings.public_send(:"#{key}=", new_value)
        changed = true
      end

      changed
    end

    def acknowledge_legal_ownership?
      ActiveModel::Type::Boolean.new.cast(params[:acknowledge_legal_ownership])
    end
  end
end
