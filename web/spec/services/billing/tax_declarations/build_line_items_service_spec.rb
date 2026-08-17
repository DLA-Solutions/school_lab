# frozen_string_literal: true

require "rails_helper"

RSpec.describe Billing::TaxDeclarations::BuildLineItemsService do
  subject(:result) do
    described_class.call(school: school, guardian: guardian, calendar_year: 2025)
  end

  let(:school) { create(:school) }
  let(:guardian) { create(:guardian, school: school) }
  let(:student) { create(:student, school: school) }
  let!(:tuition_purpose) { create(:billing_purpose, :tuition, :eligible, school: school) }

  def create_payment!(guardian:, eligible: true, paid_amount_cents: 103_000, fine: 1_000, interest: 2_000)
    purpose = eligible ? tuition_purpose : create(:billing_purpose, :enrollment, school: school, tax_declaration_eligible: false)
    payer = guardian
    charge = create(:charge, school: school, guardian: payer, contract: create(:contract, school: school, student: student))
    Billing::ApplyChargeClassificationService.call(charge: charge, billing_purpose: purpose)
    charge.save!
    create(
      :payment,
      school: school,
      charge: charge,
      paid_amount_cents: paid_amount_cents,
      fine_amount_cents: fine,
      interest_amount_cents: interest,
      paid_at: Time.zone.parse("2025-08-01 10:00:00")
    )
  end

  it "declares principal after discounts excluding fine and interest" do
    create_payment!(guardian: guardian)

    expect(result).to be_success
    expect(result.data.sum(&:declared_principal_amount_cents)).to eq(100_000)
  end

  it "excludes another guardian's payment for the same student" do
    other_guardian = create(:guardian, school: school)
    create_payment!(guardian: guardian)
    create_payment!(guardian: other_guardian)

    expect(result).to be_success
    expect(result.data.size).to eq(1)
    expect(result.data.first.charge.guardian_id).to eq(guardian.id)
  end

  it "returns unclassified_legacy_charge when purpose snapshot is missing" do
    charge = create(:charge, school: school, guardian: guardian, contract: create(:contract, school: school, student: student))
    create(:payment, school: school, charge: charge, paid_at: Time.zone.parse("2025-08-01 10:00:00"))

    expect(result).to be_failure
    expect(result.error_code).to eq(:unclassified_legacy_charge)
  end

  it "returns no_eligible_payments when nothing qualifies" do
    create_payment!(guardian: guardian, eligible: false)

    expect(result).to be_failure
    expect(result.error_code).to eq(:no_eligible_payments)
  end
end
