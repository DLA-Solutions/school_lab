# frozen_string_literal: true

require "rails_helper"

RSpec.describe Dashboards::SchoolMetricsService do
  subject(:ticket) { described_class.call(school: school, month: "2026-09").data.fetch(:average_ticket) }

  let(:school) { create(:school) }
  let(:plan) { create(:billing_plan, school: school, base_amount_cents: 100_000) }

  def contract_for(student: create(:student, school: school), **attrs)
    create(:contract, school: school, student: student, billing_plan: plan,
                      negotiated_amount_cents: nil, **attrs)
  end

  def configure_punctuality(percent)
    create(:school_billing_settings, school: school, early_payment_discount_percent: percent,
                                     early_payment_discount_day: 5)
  end

  describe "the agreed amount" do
    it "is the plan's table price when nothing else was agreed" do
      contract_for

      expect(ticket).to include(total_monthly_cents: 100_000, value: 100_000, students: 1)
    end

    it "is the negotiated amount when the family has one" do
      contract_for(negotiated_amount_cents: 85_000)

      expect(ticket).to include(total_monthly_cents: 85_000, value: 85_000)
    end

    it "applies the plan discount band to the table price" do
      contract_for(plan_discount: create(:plan_discount, school: school, percent: 20))

      expect(ticket).to include(total_monthly_cents: 80_000, value: 80_000)
    end

    it "is nothing at all for a full scholarship, though the student still counts" do
      contract_for(plan_discount: create(:plan_discount, school: school, name: "Bolsa integral",
                                                         percent: 100))
      contract_for

      expect(ticket).to include(total_monthly_cents: 100_000, students: 2, value: 50_000)
    end

    # Same precedence as charge generation: a discount band over the plan price wins.
    it "lets a discount band win over a negotiated amount, as charges are generated" do
      contract_for(negotiated_amount_cents: 70_000,
                   plan_discount: create(:plan_discount, school: school, percent: 10))

      expect(ticket).to include(total_monthly_cents: 90_000)
    end

    it "averages over the active students, not the contracts" do
      contract_for(negotiated_amount_cents: 90_000)
      create(:student, school: school)

      expect(ticket).to include(total_monthly_cents: 90_000, students: 2, value: 45_000)
    end
  end

  describe "what is left out" do
    it "ignores contracts that are not active or were discarded" do
      contract_for(negotiated_amount_cents: 80_000)
      contract_for(negotiated_amount_cents: 999_900, status: "ended")
      contract_for(negotiated_amount_cents: 888_800, status: "suspended")
      contract_for(negotiated_amount_cents: 777_700).discard

      expect(ticket).to include(total_monthly_cents: 80_000)
    end

    it "ignores contracts of students who are discarded or no longer enrolled" do
      contract_for(negotiated_amount_cents: 80_000)
      contract_for(student: create(:student, school: school, status: "transferred"),
                   negotiated_amount_cents: 500_000)
      gone = create(:student, school: school)
      contract_for(student: gone, negotiated_amount_cents: 600_000)
      gone.discard

      expect(ticket).to include(total_monthly_cents: 80_000, students: 1)
    end

    it "never counts another school's contracts" do
      contract_for(negotiated_amount_cents: 80_000)
      other = create(:school)
      create(:contract, school: other, student: create(:student, school: other),
                        billing_plan: create(:billing_plan, school: other), negotiated_amount_cents: 500_000)

      expect(ticket).to include(total_monthly_cents: 80_000)
    end
  end

  describe "the punctuality figures" do
    it "takes the school's configured percentage off each contract" do
      configure_punctuality(5)
      contract_for(negotiated_amount_cents: 80_000)
      contract_for

      expect(ticket).to include(
        punctuality_percent: 5.0,
        punctuality_total_monthly_cents: 171_000,
        punctuality_value: 85_500,
        total_monthly_cents: 180_000
      )
    end

    it "falls back to 10% when the school configured none" do
      contract_for

      expect(ticket).to include(punctuality_percent: 10.0, punctuality_total_monthly_cents: 90_000,
                                punctuality_value: 90_000)
    end

    it "rounds each contract's discount to the cent before adding up, not the grand total" do
      configure_punctuality(10)
      # 10% of 10_005 is 1_000.5 -> 1_001 (half rounds up); two such contracts discount 2_002,
      # where 10% of the 20_010 total would be 2_001.
      2.times { contract_for(negotiated_amount_cents: 10_005) }

      expect(ticket).to include(total_monthly_cents: 20_010,
                                punctuality_total_monthly_cents: 20_010 - 2_002)
    end

    it "stacks on the discount band, not on the table price" do
      contract_for(plan_discount: create(:plan_discount, school: school, percent: 20))

      expect(ticket).to include(total_monthly_cents: 80_000, punctuality_total_monthly_cents: 72_000)
    end

    it "is nothing for a full scholarship" do
      contract_for(plan_discount: create(:plan_discount, school: school, percent: 100))

      expect(ticket).to include(punctuality_total_monthly_cents: 0)
    end

    it "reports zero, not an error, with no students" do
      expect(ticket).to include(value: 0, students: 0, total_monthly_cents: 0, punctuality_value: 0,
                                punctuality_total_monthly_cents: 0, punctuality_percent: 10.0,
                                previous: 0, change_percent: 0.0)
    end
  end

  describe "the comparison" do
    it "has no movement while no earlier month was billed" do
      contract_for(negotiated_amount_cents: 80_000)

      expect(ticket).to include(value: 80_000, previous: 80_000, change_percent: 0.0, is_up: true)
    end

    it "compares with what the month before billed per contract when there is such a month" do
      student = create(:student, school: school)
      contract = contract_for(student: student, negotiated_amount_cents: 80_000)
      create(:charge, school: school, contract: contract, kind: "tuition",
                      billing_period: Date.new(2026, 8, 1), total_amount_cents: 40_000)

      expect(ticket).to include(value: 80_000, previous: 40_000, change_percent: 100.0, is_up: true)
    end
  end

  it "loads plans and discounts once, whatever the number of contracts" do
    discount = create(:plan_discount, school: school, percent: 10)
    3.times { contract_for(plan_discount: discount) }

    queries = []
    callback = ->(*, payload) { queries << payload[:sql] if payload[:sql].match?(/FROM "(billing_plans|plan_discounts)"/) }
    ActiveSupport::Notifications.subscribed(callback, "sql.active_record") { ticket }

    expect(queries.size).to eq(2)
  end
end
