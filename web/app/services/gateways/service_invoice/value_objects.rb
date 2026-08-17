# frozen_string_literal: true

module Gateways
  module ServiceInvoice
    module ValueObjects
      SupportedCity = Data.define(:code, :name, :state, :provider, :provider_options)

      FiscalSettings = Data.define(
        :federal_service_code,
        :cnae_code,
        :city_service_code,
        :nbs_code,
        :national_taxation_code,
        :iss_rate_percent,
        :service_description,
        :taxation_type,
        :tax_location,
        :spedy_city_code,
        :issuance_city_name,
        :issuance_state,
        :reform_tributaria_enabled,
        :ibs_cbs_config
      )

      IssueRequest = Data.define(
        :integration_id,
        :idempotency_key,
        :paid_amount_cents,
        :paid_at,
        :description,
        :customer,
        :fiscal_settings,
        :payment_id,
        :charge_id,
        :school_id
      ) do
        def initialize(integration_id:, idempotency_key:, paid_amount_cents:, paid_at:, description:,
                       customer:, fiscal_settings:, payment_id:, charge_id:, school_id:)
          super(
            integration_id: integration_id,
            idempotency_key: idempotency_key,
            paid_amount_cents: paid_amount_cents,
            paid_at: paid_at,
            description: description,
            customer: customer,
            fiscal_settings: fiscal_settings,
            payment_id: payment_id,
            charge_id: charge_id,
            school_id: school_id
          )
        end
      end

      Issuance = Data.define(
        :provider_document_id,
        :status,
        :invoice_number,
        :verification_code,
        :access_key
      )

      RemoteDocument = Data.define(
        :provider_document_id,
        :status,
        :invoice_number,
        :verification_code,
        :access_key,
        :paid_amount_cents,
        :effective_date
      )

      Artifacts = Data.define(:pdf_bytes, :xml_bytes)

      Event = Data.define(
        :provider,
        :provider_event_id,
        :event_type,
        :provider_resource_id,
        :payload,
        :company_federal_tax_number,
        :company_id
      )
    end
  end
end
