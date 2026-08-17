# frozen_string_literal: true

module Billing
  class UpdateFiscalSettingsService < ApplicationService
    def initialize(school:, params:, adapter: nil)
      @school = school
      @params = params
      @adapter = adapter
    end

    def call
      settings = school.school_fiscal_setting || school.build_school_fiscal_setting(default_attributes)
      settings.assign_attributes(permitted_params)

      if city_changed?(settings)
        validation = validate_city!(settings)
        return validation if validation.failure?
      end

      if settings.enabled? && !settings.complete_for_issuance?
        return ResponseService.failure(code: :fiscal_configuration_incomplete)
      end

      settings.save!
      ResponseService.success(data: settings)
    rescue ActiveRecord::RecordInvalid => e
      ResponseService.failure(code: :validation_error, details: e.record.errors.to_hash)
    rescue Gateways::ServiceInvoice::ValidationError => e
      ResponseService.failure(code: :validation_error, details: e.details.presence || { city: [ "invalid" ] })
    end

    private

    attr_reader :school, :params

    def permitted_params
      params.slice(
        :enabled, :issuance_city_name, :issuance_state, :spedy_city_code,
        :federal_service_code, :cnae_code, :city_service_code, :nbs_code,
        :national_taxation_code, :iss_rate_percent, :service_description,
        :taxation_type, :tax_location, :issue_type, :reform_tributaria_enabled,
        :provider_options_snapshot, :ibs_cbs_config
      )
    end

    def default_attributes
      {
        issuance_city_name: "Pending",
        issuance_state: "GO",
        spedy_city_code: 0,
        taxation_type: "taxationInMunicipality",
        tax_location: "companyMunicipality"
      }
    end

    def city_changed?(settings)
      settings.will_save_change_to_spedy_city_code? ||
        settings.will_save_change_to_issuance_city_name? ||
        settings.will_save_change_to_issuance_state?
    end

    def validate_city!(settings)
      cities = adapter.list_supported_cities(code: settings.spedy_city_code)
      city = cities.find { |c| c.code.to_i == settings.spedy_city_code.to_i }
      return ResponseService.failure(code: :validation_error, details: { spedy_city_code: [ "invalid" ] }) unless city

      settings.provider_options_snapshot = city.provider_options
      settings.issuance_city_name = city.name
      settings.issuance_state = city.state
      ResponseService.success(data: city)
    end

    def adapter
      @adapter ||= Billing::SearchSupportedCitiesService.new(school: school).send(:resolve_adapter)
    end
  end
end
