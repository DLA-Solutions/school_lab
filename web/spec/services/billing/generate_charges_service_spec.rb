# frozen_string_literal: true

require "rails_helper"

RSpec.describe Billing::GenerateChargesService do
  subject(:result) { described_class.call(school: school, billing_period: "2026-08") }

  let(:school) { create(:school) }
  let(:guardian) { create(:guardian, school: school, name: "Maria Silva") }
  let(:student) { create(:student, school: school, name: "Pedro Silva") }
  let(:billing_plan) { create(:billing_plan, school: school, base_amount: 900.00) }
  let!(:student_guardian) do
    create(:student_guardian, school: school, student: student, guardian: guardian, primary_guardian: true)
  end
  let!(:contract) do
    create(:contract, school: school, student: student, billing_plan: billing_plan,
                      negotiated_amount: 900.00, due_day: 10, status: "active")
  end

  it "creates a pending charge for an active contract" do
    expect { result }.to change(Charge, :count).by(1)

    charge = result.data.first
    expect(charge.guardian_id).to eq(guardian.id)
    expect(charge.school_id).to eq(school.id)
    expect(charge.billing_period).to eq("2026-08")
    expect(charge.status).to eq("pending")
    expect(charge.total_amount).to eq(900.00)
    expect(charge.psp_charge_id).to be_present
  end

  it "does not duplicate charges for the same period" do
    described_class.call(school: school, billing_period: "2026-08")

    expect { result }.not_to change(Charge, :count)
  end
end
