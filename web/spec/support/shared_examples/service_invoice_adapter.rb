# frozen_string_literal: true

RSpec.shared_examples "a service invoice adapter" do |provider_name|
  let(:school) { create(:school) }
  let(:adapter) { described_class.new(school: school) }

  let(:customer) do
    Gateways::BankSlip::ValueObjects::Customer.new(
      name: "Maria Silva",
      document_number: "52998224725",
      email: "maria@example.com",
      address: Gateways::BankSlip::ValueObjects::Address.new(
        street: "Rua Exemplo",
        number: "100",
        complement: nil,
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
      city_service_code: nil,
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
      integration_id: "pay-42",
      idempotency_key: "test-key-#{SecureRandom.hex(4)}",
      paid_amount_cents: 150_000,
      paid_at: Time.zone.parse("2026-08-17T12:00:00Z"),
      description: "Mensalidade escolar - ref. 08/2026",
      customer: customer,
      fiscal_settings: fiscal_settings,
      payment_id: 42,
      charge_id: 99,
      school_id: school.id
    )
  end

  it "implements all operations" do
    expect(adapter).to respond_to(
      :issue, :fetch, :check_status, :cancel, :download_artifacts,
      :list_documents, :list_supported_cities, :capabilities
    )
  end

  it "returns an Issuance from issue" do
    issuance = adapter.issue(issue_request)

    expect(issuance).to be_a(Gateways::ServiceInvoice::ValueObjects::Issuance)
    expect(issuance.provider_document_id).to be_present
    expect(issuance.status).to eq("enqueued")
  end

  it "returns a RemoteDocument from fetch" do
    issuance = adapter.issue(issue_request)
    document = adapter.fetch(provider_document_id: issuance.provider_document_id)

    expect(document).to be_a(Gateways::ServiceInvoice::ValueObjects::RemoteDocument)
    expect(document.provider_document_id).to eq(issuance.provider_document_id)
  end

  it "returns Capabilities from capabilities" do
    caps = adapter.capabilities

    expect(caps).to be_a(Gateways::ServiceInvoice::Capabilities)
  end

  it "raises ProviderError when fetching a missing document" do
    expect do
      adapter.fetch(provider_document_id: "missing-#{provider_name}")
    end.to raise_error(Gateways::ServiceInvoice::ProviderError)
  end
end
