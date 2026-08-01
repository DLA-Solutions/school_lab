# frozen_string_literal: true

require "rails_helper"

RSpec.describe Charge, type: :model do
  let(:school) { create(:school) }
  let(:guardian) { create(:guardian, school: school) }
  let(:student) { create(:student, school: school) }
  let(:billing_plan) { create(:billing_plan, school: school) }
  let(:contract) { create(:contract, school: school, student: student, billing_plan: billing_plan) }

  describe "AASM timestamps" do
    it "sets paid_at when transitioning to paid" do
      charge = create(:charge, school: school, contract: contract, guardian: guardian)

      charge.pay!

      expect(charge.reload.paid_at).to be_present
    end
  end

  describe "database constraints" do
    it "rejects negative total_amount_cents" do
      charge = build(:charge, school: school, contract: contract, guardian: guardian,
                              total_amount_cents: -100)

      expect { charge.save(validate: false) }.to raise_error(ActiveRecord::StatementInvalid)
    end

    it "rejects rows without total_amount_cents" do
      expect do
        Charge.insert!({
                         contract_id: contract.id,
                         school_id: school.id,
                         guardian_id: guardian.id,
                         billing_period: Date.new(2026, 8, 1),
                         original_amount_cents: 100,
                         discount_amount_cents: 0,
                         late_fee_amount_cents: 0,
                         status: "pending",
                         created_at: Time.current,
                         updated_at: Time.current
                       })
      end.to raise_error(ActiveRecord::NotNullViolation)
    end
  end

  describe "#current_issuance" do
    it "returns the most recent non-cancelled issuance and syncs the charge cache" do
      charge = create(:charge, school: school, contract: contract, guardian: guardian)
      cancelled = create(:charge_issuance, :issued, charge: charge, school: school,
                                                     provider_invoice_id: "inv-cancelled",
                                                     created_at: 2.days.ago)
      cancelled.cancel!

      current = create(:charge_issuance, :issued, charge: charge, school: school,
                                                   provider_invoice_id: "inv-current",
                                                   created_at: 1.day.ago)
      charge.sync_invoice_cache!

      expect(charge.current_issuance).to eq(current)
      expect(charge.provider_invoice_id).to eq("inv-current")
      expect(charge.boleto_url).to eq(current.boleto_url)
      expect(charge.pix_copy_paste).to eq(current.pix_emv)
      expect(charge.charge_issuances.where(status: "cancelled").count).to eq(1)
    end
  end

  describe "historical invoice lookup" do
    it "resolves a cancelled issuance provider_invoice_id to the charge" do
      charge = create(:charge, school: school, contract: contract, guardian: guardian)
      cancelled = create(:charge_issuance, :issued, charge: charge, school: school,
                                                     provider_invoice_id: "inv-replaced")
      cancelled.cancel!
      create(:charge_issuance, :issued, charge: charge, school: school,
                                          provider_invoice_id: "inv-replacement")

      found = ChargeIssuance.find_by_provider_invoice_id!("inv-replaced")

      expect(found.charge_id).to eq(charge.id)
      expect(found.status).to eq("cancelled")
    end
  end
end
