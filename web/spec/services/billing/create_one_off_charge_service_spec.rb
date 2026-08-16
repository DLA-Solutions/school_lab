# frozen_string_literal: true

require "rails_helper"

RSpec.describe Billing::CreateOneOffChargeService do
  include ActiveJob::TestHelper

  let(:school) { create(:school) }
  let(:guardian) { create(:guardian, school: school, name: "Maria Silva") }
  let(:params) do
    {
      total_amount_cents: 7_500,
      due_date: "2026-09-15",
      description: "Aluguel da quadra",
      billing_purpose_id: purpose.id
    }
  end
  let!(:purpose) { create(:billing_purpose, school: school, code: "material", name: "Material") }

  def call(**overrides)
    described_class.call(**{ school: school, guardian: guardian, params: params }.merge(overrides))
  end

  it "raises the charge against the guardian given" do
    result = call

    expect(result).to be_success
    charge = result.data
    expect(charge.guardian_id).to eq(guardian.id)
    expect(charge.kind).to eq("one_off")
    expect(charge.total_amount_cents).to eq(7_500)
    expect(charge.due_date).to eq(Date.new(2026, 9, 15))
  end

  # A one-off exists to be paid. Creating the row and stopping there leaves the charge open with
  # no boleto behind it — the guardian has nothing to pay and the school cannot tell why.
  it "hands the charge it created to the bank" do
    expect { call }.to have_enqueued_job(Billing::IssueChargeJob).with(kind_of(Integer), school.id)
  end

  it "files the charge under the month it falls due" do
    expect(call.data.billing_period).to eq(Date.new(2026, 9, 1))
  end

  context "when a contract is given instead of a guardian" do
    let(:student) { create(:student, school: school) }
    let(:billing_plan) { create(:billing_plan, school: school) }
    # A contract only accepts a payer who already signs for the student.
    let!(:student_guardian) do
      create(:student_guardian, school: school, student: student, guardian: guardian)
    end
    let(:contract) do
      create(:contract, school: school, student: student, billing_plan: billing_plan,
                        payer_guardian: guardian)
    end

    it "bills whoever answers for it" do
      result = call(guardian: nil, contract: contract)

      expect(result).to be_success
      expect(result.data.guardian_id).to eq(guardian.id)
      expect(result.data.contract_id).to eq(contract.id)
    end
  end

  describe "what it refuses" do
    it "refuses one with no payer at all" do
      expect(call(guardian: nil)).to be_failure
    end

    it "refuses a non-positive amount" do
      expect(call(params: params.merge(total_amount_cents: 0))).to be_failure
    end

    it "refuses an unreadable due date" do
      expect(call(params: params.merge(due_date: "not a date"))).to be_failure
    end

    it "refuses one without a billing purpose" do
      expect(call(params: params.except(:billing_purpose_id))).to be_failure
    end

    # Nothing should reach the bank for a charge that was never created.
    it "enqueues no issuance for a charge it refused" do
      expect { call(params: params.merge(total_amount_cents: 0)) }
        .not_to have_enqueued_job(Billing::IssueChargeJob)
    end
  end
end
