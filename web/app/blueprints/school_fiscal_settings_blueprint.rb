# frozen_string_literal: true

class SchoolFiscalSettingsBlueprint < Blueprinter::Base
  identifier :id

  fields :enabled, :issuance_city_name, :issuance_state, :spedy_city_code,
         :federal_service_code, :cnae_code, :city_service_code, :nbs_code,
         :national_taxation_code, :iss_rate_percent, :service_description,
         :taxation_type, :tax_location, :issue_type, :reform_tributaria_enabled,
         :provider_options_snapshot, :ibs_cbs_config
end
