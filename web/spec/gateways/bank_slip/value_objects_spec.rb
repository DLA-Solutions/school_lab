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
  it "exposes all presentation fields when the provider issues synchronously (Cora/Fake)" do
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

  it "defaults presentation fields to nil when the provider issues asynchronously (Inter)" do
    issuance = described_class.new(
      provider_invoice_id: "inv-2",
      status: "draft",
      amount_cents: 85_000
    )

    expect(issuance.provider_invoice_id).to eq("inv-2")
    expect(issuance.status).to eq("draft")
    expect(issuance.amount_cents).to eq(85_000)
    expect(issuance.boleto_url).to be_nil
    expect(issuance.digitable_line).to be_nil
    expect(issuance.barcode).to be_nil
    expect(issuance.our_number).to be_nil
    expect(issuance.pix_emv).to be_nil
  end
end

RSpec.describe Gateways::BankSlip::ValueObjects::RemoteInvoice do
  it "exposes presentation fields when the provider passes them through (Inter)" do
    invoice = described_class.new(
      provider_invoice_id: "inv-1",
      status: "open",
      total_amount_cents: 85_000,
      due_date: Date.current,
      boleto_url: "https://example.com/boleto",
      digitable_line: "123",
      barcode: "456",
      our_number: "789",
      pix_emv: "000201"
    )

    expect(invoice.boleto_url).to eq("https://example.com/boleto")
    expect(invoice.digitable_line).to eq("123")
    expect(invoice.barcode).to eq("456")
    expect(invoice.our_number).to eq("789")
    expect(invoice.pix_emv).to eq("000201")
  end

  it "defaults presentation fields to nil when the provider never carries them here (Cora/Fake)" do
    invoice = described_class.new(
      provider_invoice_id: "inv-1",
      status: "open",
      total_amount_cents: 85_000,
      due_date: Date.current
    )

    expect(invoice.boleto_url).to be_nil
    expect(invoice.digitable_line).to be_nil
    expect(invoice.barcode).to be_nil
    expect(invoice.our_number).to be_nil
    expect(invoice.pix_emv).to be_nil
  end
end
