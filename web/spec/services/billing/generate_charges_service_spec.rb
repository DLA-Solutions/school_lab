# frozen_string_literal: true

require "rails_helper"

RSpec.describe Billing::GenerateChargesService do
  subject(:result) { described_class.call(school: school, billing_period: billing_period) }

  let(:school) { create(:school) }
  let(:guardian) { create(:guardian, school: school, name: "Maria Silva") }
  let(:student) { create(:student, school: school, name: "Pedro Silva") }
  let(:billing_plan) { create(:billing_plan, school: school, base_amount_cents: 90_000) }
  let(:billing_period) { "2026-08" }
  let!(:student_guardian) do
    create(:student_guardian, school: school, student: student, guardian: guardian, primary_guardian: true)
  end
  let!(:contract) do
    create(:contract, school: school, student: student, billing_plan: billing_plan,
                      negotiated_amount_cents: 90_000, due_day: 10, status: "active")
  end

  it "creates a pending charge for an active contract" do
    expect { result }.to change(Charge, :count).by(1)

    charge = result.data.fetch(:created_charges).first
    expect(charge.guardian_id).to eq(guardian.id)
    expect(charge.school_id).to eq(school.id)
    expect(charge.billing_period).to eq(Date.new(2026, 8, 1))
    expect(charge.status).to eq("pending")
    expect(charge.total_amount_cents).to eq(90_000)
    expect(charge.provider_invoice_id).to be_present
  end

  it "normalizes billing period strings to the first day of the month" do
    result = described_class.call(school: school, billing_period: Date.new(2026, 3, 15))

    charge = result.data.fetch(:created_charges).first
    expect(charge.billing_period).to eq(Date.new(2026, 3, 1))
  end

  it "does not duplicate charges for the same period" do
    described_class.call(school: school, billing_period: billing_period)

    expect { result }.not_to change(Charge, :count)
    expect(result.data.fetch(:skipped_contract_ids)).to eq([contract.id])
  end

  it "creates a charge when a discarded charge exists for the same period" do
    create(:charge, school: school, contract: contract, guardian: guardian,
                    billing_period: Date.new(2026, 8, 1)).discard!

    expect { result }.to change(Charge.kept, :count).by(1)
    expect(result).to be_success
  end

  it "reports created and skipped contracts when only some already have charges" do
    other_student = create(:student, school: school)
    other_contract = create(:contract, school: school, student: other_student, billing_plan: billing_plan)
    create(:student_guardian, school: school, student: other_student, guardian: guardian, primary_guardian: true)
    create(:charge, school: school, contract: contract, guardian: guardian, billing_period: Date.new(2026, 8, 1))

    expect(result.data.fetch(:created_charges).size).to eq(1)
    expect(result.data.fetch(:created_charges).first.contract_id).to eq(other_contract.id)
    expect(result.data.fetch(:skipped_contract_ids)).to eq([contract.id])
  end

  it "returns success when concurrent generation loses the race" do
    responses = []
    threads = Array.new(2) do
      Thread.new { responses << described_class.call(school: school, billing_period: billing_period) }
    end
    threads.each(&:join)

    expect(Charge.kept.where(contract: contract, billing_period: Date.new(2026, 8, 1)).count).to eq(1)
    expect(responses).to all(be_success)

    created_total = responses.sum { |response| response.data.fetch(:created_charges).size }
    skipped_total = responses.sum { |response| response.data.fetch(:skipped_contract_ids).size }
    expect(created_total).to eq(1)
    expect(skipped_total).to eq(1)
  end
end
