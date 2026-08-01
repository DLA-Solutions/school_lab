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
                         billing_period: "2026-08",
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
end
