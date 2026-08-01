# frozen_string_literal: true

RSpec.shared_examples "a bank slip adapter" do |provider_name|
  let(:school) { create(:school) }
  let(:adapter) { described_class.new(school: school) }

  let(:customer) do
    Gateways::BankSlip::ValueObjects::Customer.new(
      name: "Maria Silva",
      document_number: "12345678901"
    )
  end

  let(:issue_request) do
    Gateways::BankSlip::ValueObjects::IssueRequest.new(
      idempotency_key: "test-key-#{SecureRandom.hex(4)}",
      total_amount_cents: 85_000,
      due_date: Date.new(2026, 8, 10),
      customer: customer,
      school_id: school.id,
      charge_id: 42
    )
  end

  it "implements all five operations" do
    expect(adapter).to respond_to(:issue, :cancel, :fetch_invoice, :list_invoices, :capabilities)
  end

  it "returns an Issuance with integer cents fields from issue" do
    issuance = adapter.issue(issue_request)

    expect(issuance).to be_a(Gateways::BankSlip::ValueObjects::Issuance)
    expect(issuance.provider_invoice_id).to be_present
    expect(issuance.boleto_url).to be_present
    expect(issuance.digitable_line).to be_present
    expect(issuance.barcode).to be_present
    expect(issuance.our_number).to be_present
    expect(issuance.pix_emv).to be_present
    expect(issuance.status).to eq("open")
  end

  it "returns a RemoteInvoice from fetch_invoice" do
    issuance = adapter.issue(issue_request)
    invoice = adapter.fetch_invoice(provider_invoice_id: issuance.provider_invoice_id)

    expect(invoice).to be_a(Gateways::BankSlip::ValueObjects::RemoteInvoice)
    expect(invoice.total_amount_cents).to eq(85_000)
    expect(invoice.total_amount_cents).to be_a(Integer)
    expect(invoice.status).to eq("open")
  end

  it "returns cancelled status from cancel" do
    issuance = adapter.issue(issue_request)
    cancelled = adapter.cancel(provider_invoice_id: issuance.provider_invoice_id)

    expect(cancelled.status).to eq("cancelled")
    expect(adapter.fetch_invoice(provider_invoice_id: issuance.provider_invoice_id).status).to eq("cancelled")
  end

  it "returns an array from list_invoices" do
    issuance = adapter.issue(issue_request)
    invoices = adapter.list_invoices(since: issue_request.due_date - 1.day)

    expect(invoices).to be_an(Array)
    expect(invoices.map(&:provider_invoice_id)).to include(issuance.provider_invoice_id)
  end

  it "returns Capabilities from capabilities" do
    caps = adapter.capabilities

    expect(caps).to be_a(Gateways::BankSlip::Capabilities)
    expect(caps.inline_pix).to be_in([true, false])
  end

  it "raises ProviderError when fetching a missing invoice" do
    expect do
      adapter.fetch_invoice(provider_invoice_id: "missing-#{provider_name}")
    end.to raise_error(Gateways::BankSlip::ProviderError)
  end
end
