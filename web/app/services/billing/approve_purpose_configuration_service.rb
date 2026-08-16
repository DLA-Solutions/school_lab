# frozen_string_literal: true

module Billing
  class ApprovePurposeConfigurationService < ApplicationService
    def initialize(school:, actor:)
      @school = school
      @actor = actor
    end

    def call
      BillingPurpose.provision_defaults!(school)
      settings = TaxDeclarationSetting.for(school)
      digest = PurposeConfigurationDigest.compute(school.billing_purposes.kept.ordered)
      previous_digest = settings.approved_purpose_configuration_digest

      if previous_digest == digest
        return ResponseService.success(data: settings)
      end

      settings.assign_attributes(
        approved_purpose_configuration_digest: digest,
        legal_accounting_approved_at: Time.current,
        approved_by: actor
      )
      settings.configuration_version += 1 if previous_digest.present?

      if settings.save
        ResponseService.success(data: settings)
      else
        ResponseService.failure(code: :validation_error, details: settings.errors.to_hash)
      end
    end

    private

    attr_reader :school, :actor
  end
end
