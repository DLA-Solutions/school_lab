# frozen_string_literal: true

require "rails_helper"

RSpec.describe Billing::CreateMigratedChargeService do
  let(:school) { create(:school) }
  let(:guardian) { create(:guardian, school: school) }

  def invoice_for(status:, due_date: 10.days.from_now.to_date, payments: [])
    Gateways::BankSlip::ValueObjects::RemoteInvoice.new(
      provider_invoice_id: "inter-abc-123",
      status: status,
      total_amount_cents: 85_000,
      due_date: due_date,
      payments: payments,
      payer_cpf: guardian.cpf,
      payer_name: guardian.name
    )
  end

  def payment_for(paid_at: Time.current)
    Gateways::BankSlip::ValueObjects::RemotePayment.new(
      provider_payment_id: "inter-pay-abc-123",
      paid_amount_cents: 85_000,
      paid_at: paid_at,
      payment_method: "pix"
    )
  end

  it "creates a migrated charge from an open invoice, staying in its initial pending state" do
    result = described_class.call(school: school, guardian: guardian, invoice: invoice_for(status: "open"))

    expect(result).to be_success
    charge = result.data
    expect(charge).to be_persisted
    expect(charge.source).to eq("migrated")
    expect(charge.kind).to eq("one_off")
    expect(charge.external_reference).to eq("inter-abc-123")
    expect(charge.total_amount_cents).to eq(85_000)
    expect(charge).to be_pending
    expect(charge.billing_purpose_id).to be_nil
    expect(charge.tax_declaration_eligible).to be(false)
  end

  it "creates a migrated charge already overdue from a late invoice" do
    result = described_class.call(school: school, guardian: guardian, invoice: invoice_for(status: "late"))

    expect(result).to be_success
    expect(result.data).to be_overdue
  end

  it "creates a migrated charge already cancelled from a cancelled invoice" do
    result = described_class.call(school: school, guardian: guardian, invoice: invoice_for(status: "cancelled"))

    expect(result).to be_success
    expect(result.data).to be_cancelled
  end

  it "creates a paid migrated charge and records the Payment with the bank's paid_at" do
    paid_at = 3.days.ago.change(usec: 0)
    invoice = invoice_for(status: "paid", payments: [ payment_for(paid_at: paid_at) ])

    result = described_class.call(school: school, guardian: guardian, invoice: invoice)

    expect(result).to be_success
    charge = result.data
    expect(charge).to be_paid
    expect(charge.paid_at).to eq(paid_at)
    payment = charge.payments.last
    expect(payment).to be_present
    expect(payment.paid_at).to eq(paid_at)
    expect(payment.paid_amount_cents).to eq(85_000)
  end

  it "fails instead of silently creating a pending charge when a paid invoice has no payments" do
    invoice = invoice_for(status: "paid", payments: [])

    result = described_class.call(school: school, guardian: guardian, invoice: invoice)

    expect(result).to be_failure
    expect(Charge.find_by(school_id: school.id, external_reference: "inter-abc-123")).to be_present
    expect(Charge.find_by(school_id: school.id, external_reference: "inter-abc-123")).to be_pending
  end

  it "is idempotent for the same external_reference — a retry returns the existing charge, no duplicate" do
    first = described_class.call(school: school, guardian: guardian, invoice: invoice_for(status: "open"))

    expect do
      second = described_class.call(school: school, guardian: guardian, invoice: invoice_for(status: "open"))
      expect(second).to be_success
      expect(second.data.id).to eq(first.data.id)
    end.not_to change(Charge, :count)
  end

  it "is idempotent under a race (RecordNotUnique) — returns the already-created charge" do
    existing = create(:charge, school: school, guardian: guardian, kind: "one_off", source: "migrated",
                               external_reference: "inter-abc-123", original_amount_cents: 85_000,
                               total_amount_cents: 85_000, discount_amount_cents: 0, late_fee_amount_cents: 0,
                               contract: nil)
    # Forces the service past its upfront idempotency check (as if another request created the
    # row in the window between that check and this save) and simulates the DB-level unique
    # index firing instead of the model-level uniqueness validation (which would otherwise
    # raise RecordInvalid first), so the RecordNotUnique rescue path is actually exercised.
    allow_any_instance_of(described_class).to receive(:find_existing).and_return(nil, existing) # rubocop:disable RSpec/AnyInstance
    allow_any_instance_of(Charge).to receive(:save!).and_raise(ActiveRecord::RecordNotUnique.new("duplicate")) # rubocop:disable RSpec/AnyInstance

    result = described_class.call(school: school, guardian: guardian, invoice: invoice_for(status: "open"))

    expect(result).to be_success
    expect(result.data.id).to eq(existing.id)
  end
end
