# frozen_string_literal: true

module Api
  module V1
    module Schools
      module Billing
        class FiscalSettingsController < BaseController
          def show
            settings = fiscal_settings_record
            authorize settings

            render json: { data: SchoolFiscalSettingsBlueprint.render_as_hash(settings) }
          end

          def update
            settings = fiscal_settings_record
            authorize settings

            result = ::Billing::UpdateFiscalSettingsService.call(
              school: Current.school,
              params: fiscal_settings_params
            )
            render_service_result(result) do |data|
              render json: { data: SchoolFiscalSettingsBlueprint.render_as_hash(data) }
            end
          end

          private

          def fiscal_settings_record
            Current.school.school_fiscal_setting ||
              Current.school.build_school_fiscal_setting(
                issuance_city_name: "Pending",
                issuance_state: "GO",
                spedy_city_code: 0
              )
          end

          def fiscal_settings_params
            params.require(:fiscal_settings).permit(
              :enabled, :issuance_city_name, :issuance_state, :spedy_city_code,
              :federal_service_code, :cnae_code, :city_service_code, :nbs_code,
              :national_taxation_code, :iss_rate_percent, :service_description,
              :taxation_type, :tax_location, :issue_type, :reform_tributaria_enabled,
              provider_options_snapshot: {},
              ibs_cbs_config: {}
            )
          end
        end
      end
    end
  end
end
