# frozen_string_literal: true

require "rails_helper"

RSpec.describe Billing::BusinessDayCalendar do
  describe ".effective_due_date" do
    it "rolls Saturday due dates to Monday" do
      saturday = Date.new(2026, 8, 8) # Saturday
      expect(described_class.effective_due_date(saturday)).to eq(Date.new(2026, 8, 10))
    end

    it "rolls national holidays to the next business day" do
      independence = Date.new(2026, 9, 7) # Monday holiday
      expect(described_class.effective_due_date(independence)).to eq(Date.new(2026, 9, 8))
    end
  end

  describe ".add_business_days" do
    it "skips weekends when adding business days" do
      friday = Date.new(2026, 8, 7)
      expect(described_class.add_business_days(friday, 1)).to eq(Date.new(2026, 8, 10))
    end
  end
end

RSpec.describe Billing::MarkOverdueChargesService do
  include ActiveSupport::Testing::TimeHelpers

  let(:school) { create(:school) }
  let(:guardian) { create(:guardian, school: school) }
  let(:student) { create(:student, school: school) }
  let(:billing_plan) { create(:billing_plan, school: school) }
  let(:contract) { create(:contract, school: school, student: student, billing_plan: billing_plan) }

  let(:grace_days) { 2 }

  before do
    create(:school_billing_settings, school: school, overdue_grace_days: grace_days)
  end

  context "with a grace window" do
    it "does not mark a charge overdue inside the grace window" do
      charge = create(:charge, school: school, contract: contract, guardian: guardian,
                               due_date: 1.day.ago.to_date)

      described_class.call(school: school, as_of: Date.current)

      expect(charge.reload.status).to eq("pending")
    end

    it "marks a charge overdue past the grace window" do
      charge = create(:charge, school: school, contract: contract, guardian: guardian,
                               due_date: 3.days.ago.to_date)

      described_class.call(school: school, as_of: Date.current)

      expect(charge.reload.status).to eq("overdue")
      expect(charge.overdue_at).to be_present
    end
  end

  context "with per-school grace settings" do
    let(:grace_days) { 0 }
    let(:school_two) { create(:school) }

    before do
      create(:school_billing_settings, school: school_two, overdue_grace_days: 5)
    end

    it "applies each school's grace window independently" do
      as_of = Date.new(2026, 8, 11) # Tuesday
      due_date = Date.new(2026, 8, 7) # Friday — effective due date stays Friday with grace 0

      charge_one = create(:charge, school: school, contract: contract, guardian: guardian,
                                 due_date: due_date)
      contract_two = create(:contract, school: school_two, student: create(:student, school: school_two),
                                       billing_plan: create(:billing_plan, school: school_two))
      charge_two = create(:charge, school: school_two, contract: contract_two,
                                   guardian: create(:guardian, school: school_two),
                                   due_date: due_date)

      described_class.call(as_of: as_of)

      expect(charge_one.reload.status).to eq("overdue")
      expect(charge_two.reload.status).to eq("pending")
    end
  end

  context "with weekend due dates" do
    let(:grace_days) { 0 }

    it "uses the next business day as the effective due date" do
      saturday = Date.new(2026, 8, 8)
      charge = create(:charge, school: school, contract: contract, guardian: guardian, due_date: saturday)

      described_class.call(school: school, as_of: Date.new(2026, 8, 10)) # Monday
      expect(charge.reload.status).to eq("pending")

      described_class.call(school: school, as_of: Date.new(2026, 8, 11)) # Tuesday
      expect(charge.reload.status).to eq("overdue")
    end
  end

  context "with a national holiday due date" do
    let(:grace_days) { 0 }

    it "waits until the day after the effective due date" do
      holiday = Date.new(2026, 9, 7)
      charge = create(:charge, school: school, contract: contract, guardian: guardian, due_date: holiday)

      described_class.call(school: school, as_of: Date.new(2026, 9, 8))
      expect(charge.reload.status).to eq("pending")

      described_class.call(school: school, as_of: Date.new(2026, 9, 9))
      expect(charge.reload.status).to eq("overdue")
    end
  end

  context "near a timezone boundary" do
    let(:grace_days) { 0 }

    it "evaluates using the school timezone date" do
      charge = create(:charge, school: school, contract: contract, guardian: guardian,
                               due_date: Date.new(2026, 8, 8)) # Saturday -> effective Monday Aug 10

      travel_to Time.utc(2026, 8, 10, 2, 0, 0) do # Aug 9 23:00 in America/Sao_Paulo
        described_class.call(school: school)
        expect(charge.reload.status).to eq("pending")
      end

      travel_to Time.utc(2026, 8, 11, 4, 0, 0) do # Aug 11 01:00 in America/Sao_Paulo
        described_class.call(school: school)
        expect(charge.reload.status).to eq("overdue")
      end
    end
  end

  it "only marks kept pending charges overdue" do
    school.school_billing_settings&.destroy
    create(:school_billing_settings, school: school, overdue_grace_days: 0)
    pending = create(:charge, school: school, contract: contract, guardian: guardian, due_date: 5.days.ago.to_date)
    paid = create(:charge, :paid, school: school, contract: contract, guardian: guardian,
                                   due_date: 5.days.ago.to_date)
    cancelled = create(:charge, :cancelled, school: school, contract: contract, guardian: guardian,
                                            due_date: 5.days.ago.to_date)
    discarded = create(:charge, school: school, contract: contract, guardian: guardian, due_date: 5.days.ago.to_date)
    discarded.discard!

    described_class.call(school: school, as_of: Date.current)

    expect(pending.reload.status).to eq("overdue")
    expect(paid.reload.status).to eq("paid")
    expect(cancelled.reload.status).to eq("cancelled")
    expect(discarded.reload.status).to eq("pending")
  end
end
