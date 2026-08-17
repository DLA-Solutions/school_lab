# frozen_string_literal: true

module Billing
  class ConfigureSpedyCompanySettingsService < ApplicationService
    def initialize(school:, settings_params:, client: nil)
      @school = school
      @settings_params = settings_params
      @client = client
    end

    def call
      config = Gateways::ServiceInvoice::Registry.active_config(school: school)
      company_id = config.spedy_company_id
      return ResponseService.failure(code: :fiscal_configuration_incomplete) if company_id.blank?

      client.update_company_settings(company_id: company_id, body: settings_params)
      ResponseService.success(data: config)
    rescue SchoolLab::Integrations::Spedy::ValidationError => e
      ResponseService.failure(code: :validation_error, details: e.details)
    rescue SchoolLab::Integrations::Spedy::Error => e
      ResponseService.failure(code: :provider_error, details: { message: e.message })
    end

    private

    attr_reader :school, :settings_params

    def client
      @client ||= begin
        config = Gateways::ServiceInvoice::Registry.active_config(school: school)
        SchoolLab::Integrations::Spedy::Client.new(api_key: config.api_key)
      end
    end
  end
end
