# frozen_string_literal: true

require "rails_helper"

RSpec.describe Gateways::BankSlip::Fake do
  it_behaves_like "a bank slip adapter", "fake"

  let(:school) { create(:school) }
  let(:adapter) { described_class.new(school: school) }

  let(:customer) do
    Gateways::BankSlip::ValueObjects::Customer.new(name: "Maria Silva", document_number: "12345678901")
  end

  let(:issue_request) do
    Gateways::BankSlip::ValueObjects::IssueRequest.new(
      idempotency_key: "idempotent-key",
      total_amount_cents: 85_000,
      due_date: Date.new(2026, 8, 10),
      customer: customer,
      school_id: school.id,
      charge_id: 99
    )
  end

  it "returns the same provider_invoice_id for duplicate idempotency keys" do
    first = adapter.issue(issue_request)
    second = adapter.issue(issue_request)

    expect(second.provider_invoice_id).to eq(first.provider_invoice_id)
  end
end
