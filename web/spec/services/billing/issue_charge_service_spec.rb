# frozen_string_literal: true

require "rails_helper"

RSpec.describe Billing::IssueChargeService do
  subject(:result) { described_class.call(charge: charge, adapter: adapter) }

  let(:school) { create(:school) }
  let(:guardian) { create(:guardian, school: school) }
  let(:charge) do
    create(:charge, school: school, guardian: guardian, due_date: Date.new(2026, 12, 10))
  end
  let(:adapter) { instance_double(Gateways::BankSlip::Fake) }
  let(:issuance_result) do
    Gateways::BankSlip::ValueObjects::Issuance.new(
      provider_invoice_id: "fake-invoice-123",
      boleto_url: "https://fake.test/boleto",
      digitable_line: "23793.38128 60000.000003 00000.000400 1 93480000085000",
      barcode: "23793934800000850003381286000000000000400000",
      our_number: "00000004",
      pix_emv: "000201pix",
      status: "open",
      amount_cents: charge.total_amount_cents
    )
  end

  before do
    allow(adapter).to receive(:issue).and_return(issuance_result)
  end

  it "creates a pending issuance before calling the provider" do
    expect { result }.to change(ChargeIssuance, :count).by(1)

    issuance = charge.reload.current_issuance
    expect(issuance.status).to eq("issued")
    expect(issuance.provider_invoice_id).to eq("fake-invoice-123")
    expect(issuance.issued_at).to be_present
    expect(charge.provider_invoice_id).to eq("fake-invoice-123")
  end

  it "passes the persisted idempotency key to the adapter" do
    result

    issuance = charge.reload.current_issuance
    expect(adapter).to have_received(:issue) do |request|
      expect(request.idempotency_key).to eq(issuance.idempotency_key)
    end
  end

  it "reuses the pending issuance idempotency key on retry" do
    allow(adapter).to receive(:issue).and_raise(Gateways::BankSlip::TransientError, "timeout")
    expect { described_class.call(charge: charge, adapter: adapter) }
      .to raise_error(Gateways::BankSlip::TransientError)

    first_key = charge.reload.current_issuance.idempotency_key
    allow(adapter).to receive(:issue).and_return(issuance_result)

    described_class.call(charge: charge, adapter: adapter)

    expect(charge.reload.charge_issuances.count).to eq(1)
    expect(charge.current_issuance.idempotency_key).to eq(first_key)
  end

  it "marks validation failures as failed without raising" do
    allow(adapter).to receive(:issue).and_raise(
      Gateways::BankSlip::ValidationError.new("Provider validation error", details: { field: "email" })
    )

    expect { result }.not_to raise_error
    expect(result).to be_failure

    issuance = charge.reload.current_issuance
    expect(issuance.status).to eq("failed")
    expect(issuance.last_error).to be_present
    expect(charge.status).to eq("pending")
  end

  it "marks authentication failures as failed with a redacted error" do
    allow(adapter).to receive(:issue).and_raise(
      Gateways::BankSlip::AuthenticationError, "mTLS handshake failed for 123.456.789-00"
    )

    expect { result }.not_to raise_error
    expect(result).to be_failure
    expect(result.error_code).to eq(:provider_error)

    issuance = charge.reload.current_issuance
    expect(issuance.status).to eq("failed")
    expect(issuance.last_error).to include("[CPF]")
    expect(issuance.last_error).not_to include("123.456.789-00")
  end

  it "marks unexpected provider responses as failed" do
    allow(adapter).to receive(:issue).and_raise(
      Gateways::BankSlip::ProviderError, "Unexpected provider response (418)"
    )

    expect { result }.not_to raise_error
    expect(result).to be_failure
    expect(result.error_code).to eq(:provider_error)

    issuance = charge.reload.current_issuance
    expect(issuance.status).to eq("failed")
    expect(issuance.last_error).to be_present
  end

  it "marks a missing provider configuration as failed instead of losing the attempt" do
    allow(adapter).to receive(:issue).and_raise(
      Gateways::BankSlip::Registry::UnknownProviderError, "No active bank_slip configuration for school 1"
    )

    expect { result }.not_to raise_error
    expect(result).to be_failure

    issuance = charge.reload.current_issuance
    expect(issuance.status).to eq("failed")
    expect(issuance.last_error).to be_present
  end

  it "propagates transient errors for the job to retry" do
    allow(adapter).to receive(:issue).and_raise(Gateways::BankSlip::TransientError, "Provider timeout")

    expect { result }.to raise_error(Gateways::BankSlip::TransientError)

    issuance = charge.reload.current_issuance
    expect(issuance.status).to eq("pending")
  end
end
