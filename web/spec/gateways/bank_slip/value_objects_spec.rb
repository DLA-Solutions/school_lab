# frozen_string_literal: true

require "rails_helper"

RSpec.describe Gateways::BankSlip::ValueObjects::IssueRequest do
  let(:customer) do
    described_class.module_parent::Customer.new(name: "Test", document_number: "123")
  end

  it "rejects BigDecimal amounts" do
    expect do
      described_class.new(
        idempotency_key: "key",
        total_amount_cents: BigDecimal("850.00"),
        due_date: Date.current,
        customer: customer
      )
    end.to raise_error(ArgumentError, /total_amount_cents/)
  end

  it "accepts integer cents" do
    request = described_class.new(
      idempotency_key: "key",
      total_amount_cents: 85_000,
      due_date: Date.current,
      customer: customer
    )

    expect(request.total_amount_cents).to eq(85_000)
  end
end

RSpec.describe Gateways::BankSlip::ValueObjects::Issuance do
  it "exposes all required fields" do
    issuance = described_class.new(
      provider_invoice_id: "inv-1",
      boleto_url: "https://example.com/boleto",
      digitable_line: "123",
      barcode: "456",
      our_number: "789",
      pix_emv: "000201",
      status: "open"
    )

    expect(issuance.provider_invoice_id).to eq("inv-1")
    expect(issuance.pix_emv).to eq("000201")
  end
end
