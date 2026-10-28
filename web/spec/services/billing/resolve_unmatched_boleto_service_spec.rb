# frozen_string_literal: true

require "rails_helper"

RSpec.describe Billing::ResolveUnmatchedBoletoService do
  let(:school) { create(:school) }
  let(:guardian) { create(:guardian, school: school) }
  let(:actor) { create(:user) }

  it "creates the right charge and marks the UnmatchedBoleto resolved" do
    boleto = create(:unmatched_boleto, school: school, provider_status: "open", amount_cents: 80_000,
                                       due_date: 10.days.from_now.to_date)

    result = described_class.call(unmatched_boleto: boleto, guardian: guardian, actor: actor)

    expect(result).to be_success
    boleto = result.data
    expect(boleto.status).to eq("resolved")
    expect(boleto.resolved_at).to be_present
    expect(boleto.resolved_by).to eq(actor)
    expect(boleto.resolved_guardian).to eq(guardian)
    charge = boleto.charge
    expect(charge).to be_present
    expect(charge.guardian).to eq(guardian)
    expect(charge.source).to eq("migrated")
    expect(charge.external_reference).to eq(boleto.provider_invoice_id)
    expect(charge).to be_pending
  end

  it "creates a paid charge with the Payment carrying the stored paid_at, for a paid boleto" do
    paid_at = 2.days.ago.change(usec: 0)
    boleto = create(:unmatched_boleto, :paid, school: school, amount_cents: 80_000, paid_amount_cents: 80_000,
                                              paid_at: paid_at, due_date: 2.days.ago.to_date)

    result = described_class.call(unmatched_boleto: boleto, guardian: guardian, actor: actor)

    expect(result).to be_success
    charge = result.data.charge
    expect(charge).to be_paid
    expect(charge.paid_at).to eq(paid_at)
  end

  it "fails with invalid_state_transition when the boleto is already resolved" do
    boleto = create(:unmatched_boleto, :resolved, school: school)

    result = described_class.call(unmatched_boleto: boleto, guardian: guardian, actor: actor)

    expect(result).to be_failure
    expect(result.error_code).to eq(:invalid_state_transition)
  end

  it "fails with invalid_state_transition when the boleto is already dismissed" do
    boleto = create(:unmatched_boleto, :dismissed, school: school)

    result = described_class.call(unmatched_boleto: boleto, guardian: guardian, actor: actor)

    expect(result).to be_failure
    expect(result.error_code).to eq(:invalid_state_transition)
  end

  it "rejects a guardian from a different school" do
    other_school = create(:school)
    other_guardian = create(:guardian, school: other_school)
    boleto = create(:unmatched_boleto, school: school)

    result = described_class.call(unmatched_boleto: boleto, guardian: other_guardian, actor: actor)

    expect(result).to be_failure
    expect(result.error_code).to eq(:cross_tenant)
    expect(boleto.reload.status).to eq("pending")
  end
end
