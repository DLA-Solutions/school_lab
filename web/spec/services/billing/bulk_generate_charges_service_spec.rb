# frozen_string_literal: true

require "rails_helper"

RSpec.describe Billing::BulkGenerateChargesService do
  include ActiveJob::TestHelper

  subject(:result) do
    described_class.call(
      school: school,
      contract_ids: [ contract.id ],
      billing_period: billing_period,
      actor: create(:user)
    )
  end

  let(:school) { create(:school) }
  let(:guardian) { create(:guardian, school: school) }
  let(:student) { create(:student, school: school) }
  let(:billing_plan) { create(:billing_plan, school: school, base_amount_cents: 100_000) }
  let(:billing_period) { "2026-08" }
  let!(:student_guardian) do
    create(:student_guardian, school: school, student: student, guardian: guardian, primary_guardian: true)
  end
  let!(:contract) do
    create(:contract, school: school, student: student, billing_plan: billing_plan,
                      payer_guardian: guardian, negotiated_amount_cents: 75_000,
                      due_day: 10, status: "active")
  end

  context "when the contract has a plan discount band" do
    let(:plan_discount) { create(:plan_discount, school: school, percent: 10) }

    before { contract.update!(plan_discount: plan_discount) }

    it "applies the band from the plan base and records an applied_discount" do
      expect { result }.to change(Charge, :count).by(1)
        .and change(AppliedDiscount, :count).by(1)
        .and have_enqueued_job(Billing::IssueChargeJob)

      charge = result.data.fetch(:created_charges).first
      expect(charge.original_amount_cents).to eq(100_000)
      expect(charge.discount_amount_cents).to eq(10_000)
      expect(charge.total_amount_cents).to eq(90_000)

      applied = charge.applied_discounts.sole
      expect(applied.discount_type).to eq("plan_discount")
      expect(applied.amount_cents).to eq(10_000)
    end
  end

  context "when the contract has no plan discount band" do
    it "uses negotiated or base amount with zero discount" do
      charge = result.data.fetch(:created_charges).first

      expect(charge.original_amount_cents).to eq(75_000)
      expect(charge.discount_amount_cents).to eq(0)
      expect(charge.total_amount_cents).to eq(75_000)
      expect(charge.applied_discounts).to be_empty
    end
  end

  context "when a child has more than one active contract" do
    let!(:newer_contract) do
      create(:contract, school: school, student: student, billing_plan: billing_plan,
                        payer_guardian: guardian, negotiated_amount_cents: 90_000, due_day: 10)
    end

    subject(:result) do
      described_class.call(
        school: school, contract_ids: [ contract.id, newer_contract.id ],
        billing_period: billing_period, actor: create(:user)
      )
    end

    it "raises one charge, on the contract that stands for the child, and reports the other as skipped" do
      expect { result }.to change(Charge, :count).by(1)

      expect(result.data.fetch(:created_charges).sole.contract_id).to eq(newer_contract.id)
      expect(result.data.fetch(:created_charges).sole.total_amount_cents).to eq(90_000)
      expect(result.data.fetch(:ineligible_contract_ids)).to eq([ contract.id ])
      expect(result.data.fetch(:skipped_contract_ids)).to be_empty
    end

    it "bills nothing for a non-standing contract sent on its own" do
      outcome = described_class.call(school: school, contract_ids: [ contract.id ],
                                     billing_period: billing_period, actor: create(:user))

      expect(outcome.data.fetch(:created_charges)).to be_empty
      expect(outcome.data.fetch(:ineligible_contract_ids)).to eq([ contract.id ])
      expect(outcome.data.fetch(:skipped_contract_ids)).to be_empty
    end
  end

  context "when the student is no longer enrolled" do
    it "does not bill a transferred student" do
      student.update!(status: "transferred")

      expect { result }.not_to change(Charge, :count)
      expect(result.data.fetch(:ineligible_contract_ids)).to eq([ contract.id ])
      expect(result.data.fetch(:skipped_contract_ids)).to be_empty
    end

    it "does not bill a discarded student" do
      student.discard

      expect { result }.not_to change(Charge, :count)
      expect(result.data.fetch(:ineligible_contract_ids)).to eq([ contract.id ])
    end
  end

  context "when a contract belongs to another school" do
    it "neither bills nor reports it" do
      other = create(:school)
      foreign = create(:contract, school: other, student: create(:student, school: other),
                                  billing_plan: create(:billing_plan, school: other))

      outcome = described_class.call(school: school, contract_ids: [ foreign.id ],
                                     billing_period: billing_period, actor: create(:user))

      expect(outcome.data.fetch(:created_charges)).to be_empty
      expect(outcome.data.fetch(:skipped_contract_ids)).to be_empty
      expect(outcome.data.fetch(:ineligible_contract_ids)).to be_empty
    end
  end

  context "when the period already has a charge for the contract" do
    it "reports it as skipped, not ineligible" do
      create(:charge, school: school, contract: contract, guardian: guardian,
                      kind: "tuition", billing_period: Date.new(2026, 8, 1))

      expect { result }.not_to change(Charge, :count)
      expect(result.data.fetch(:skipped_contract_ids)).to eq([ contract.id ])
      expect(result.data.fetch(:ineligible_contract_ids)).to be_empty
    end
  end
end
