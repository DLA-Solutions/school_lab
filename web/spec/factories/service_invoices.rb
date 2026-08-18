# frozen_string_literal: true

FactoryBot.define do
  factory :school_fiscal_setting do
    school
    enabled { false }
    issuance_city_name { "Goiânia" }
    issuance_state { "GO" }
    spedy_city_code { 5_208_707 }
    provider_options_snapshot { {} }
    federal_service_code { "8.01" }
    cnae_code { "8513900" }
    iss_rate_percent { 5.0 }
    service_description { "Mensalidade escolar" }
    taxation_type { "taxationInMunicipality" }
    tax_location { "companyMunicipality" }

    trait :enabled do
      enabled { true }
    end
  end

  factory :service_invoice do
    school
    payment
    charge { payment.charge }
    provider { "fake" }
    integration_id { "pay-#{payment.id}" }

    trait :enqueued do
      provider_document_id { "fake-si-#{SecureRandom.hex(4)}" }

      after(:create, &:enqueue!)
    end

    trait :authorized do
      provider_document_id { "fake-si-#{SecureRandom.hex(4)}" }
      invoice_number { "12345" }
      verification_code { "ABCD1234" }

      after(:create) do |invoice|
        invoice.enqueue! if invoice.may_enqueue?
        invoice.authorize! if invoice.may_authorize?
      end
    end

    trait :failed do
      last_error { "Provider error" }

      after(:create, &:mark_failed!)
    end
  end

  factory :service_invoice_attempt do
    service_invoice
    school { service_invoice.school }
    provider { service_invoice.provider }
    idempotency_key { SecureRandom.uuid }
  end
end
