# frozen_string_literal: true

require "rails_helper"

RSpec.describe "charges billing_period uniqueness", type: :model do
  let(:school) { create(:school) }
  let(:guardian) { create(:guardian, school: school) }
  let(:student) { create(:student, school: school) }
  let(:billing_plan) { create(:billing_plan, school: school) }
  let(:contract) { create(:contract, school: school, student: student, billing_plan: billing_plan) }
  let(:billing_period) { Date.new(2026, 3, 1) }

  it "rejects duplicate kept charges for the same contract and period" do
    create(:charge, school: school, contract: contract, guardian: guardian, billing_period: billing_period)
    duplicate = build(:charge, school: school, contract: contract, guardian: guardian, billing_period: billing_period)

    expect { duplicate.save(validate: false) }.to raise_error(ActiveRecord::RecordNotUnique)
  end
end
