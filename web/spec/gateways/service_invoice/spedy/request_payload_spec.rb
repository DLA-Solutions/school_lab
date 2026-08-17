# frozen_string_literal: true

require "rails_helper"

RSpec.describe Gateways::ServiceInvoice::Spedy::RequestPayload do
  let(:customer) do
    Gateways::BankSlip::ValueObjects::Customer.new(
      name: "Maria Silva",
      document_number: "52998224725",
      email: "maria@example.com",
      phone: "+5562999999999",
      address: Gateways::BankSlip::ValueObjects::Address.new(
        street: "Rua Exemplo",
        number: "100",
        complement: "Apto 1",
        neighborhood: "Centro",
        city: "Goiânia",
        state: "GO",
        postal_code: "74000000"
      )
    )
  end

  let(:fiscal_settings) do
    Gateways::ServiceInvoice::ValueObjects::FiscalSettings.new(
      federal_service_code: "8.01",
      cnae_code: "8513900",
      city_service_code: "1234",
      nbs_code: nil,
      national_taxation_code: nil,
      iss_rate_percent: 5.0,
      service_description: "Mensalidade escolar",
      taxation_type: "taxationInMunicipality",
      tax_location: "companyMunicipality",
      spedy_city_code: 5_208_707,
      issuance_city_name: "Goiânia",
      issuance_state: "GO",
      reform_tributaria_enabled: false,
      ibs_cbs_config: {}
    )
  end

  let(:issue_request) do
    Gateways::ServiceInvoice::ValueObjects::IssueRequest.new(
      integration_id: "pay-12345",
      idempotency_key: SecureRandom.uuid,
      paid_amount_cents: 150_000,
      paid_at: Time.zone.parse("2026-08-17T12:00:00Z"),
      description: "Mensalidade escolar - ref. 08/2026",
      customer: customer,
      fiscal_settings: fiscal_settings,
      payment_id: 12_345,
      charge_id: 99,
      school_id: 1
    )
  end

  subject(:payload) { described_class.from(issue_request) }

  it "maps integration id and amounts" do
    expect(payload[:integrationId]).to eq("pay-12345")
    expect(payload[:total][:invoiceAmount]).to eq(1500.0)
    expect(payload[:total][:issRate]).to eq(5.0)
  end

  it "maps receiver from guardian customer" do
    expect(payload[:receiver][:name]).to eq("Maria Silva")
    expect(payload[:receiver][:federalTaxNumber]).to eq("52998224725")
    expect(payload[:receiver][:address][:city][:name]).to eq("Goiânia")
  end

  it "includes fiscal codes from settings" do
    expect(payload[:federalServiceCode]).to eq("8.01")
    expect(payload[:cnaeCode]).to eq("8513900")
    expect(payload[:cityServiceCode]).to eq("1234")
  end

  it "sets effective date from payment" do
    expect(payload[:effectiveDate]).to eq(issue_request.paid_at.iso8601)
  end
end
