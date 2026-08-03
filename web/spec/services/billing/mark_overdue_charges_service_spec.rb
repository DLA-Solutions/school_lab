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

  # BusinessDayCalendar rolls due dates forward over weekends and national holidays, so an
  # example built from relative dates (`2.days.ago`) reaches a different verdict depending on
  # which weekday the suite happens to run, and on whether Time.zone and the machine clock
  # agree on today's date. Every example below pins an absolute instant and derives its dates
  # from it. 2026-08-07 is a Friday and its surrounding week holds no national holiday.
  let(:today) { Date.new(2026, 8, 7) }

  # Examples that let the service resolve "today" itself pin the clock to that Friday; the ones
  # that pass an explicit `as_of`, or that travel to a boundary instant of their own, do not.
  shared_context "with the clock pinned to the reference Friday" do
    around do |example|
      travel_to(Time.utc(2026, 8, 7, 15, 0, 0)) { example.run } # 12:00 in America/Sao_Paulo
    end
  end

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
    include_context "with the clock pinned to the reference Friday"

    it "does not mark a charge overdue inside the grace window" do
      charge = create(:charge, school: school, contract: contract, guardian: guardian,
                               due_date: today - 1) # Thursday, one day inside the 2-day grace

      described_class.call(school: school)

      expect(charge.reload.status).to eq("pending")
    end

    it "marks a charge overdue past the grace window" do
      charge = create(:charge, school: school, contract: contract, guardian: guardian,
                               due_date: today - 3) # Tuesday, one day past the 2-day grace

      described_class.call(school: school)

      expect(charge.reload.status).to eq("overdue")
      expect(charge.overdue_at).to be_present
    end
  end

  context "with per-school grace settings" do
    include_context "with the clock pinned to the reference Friday"

    let(:grace_days) { 0 }
    let(:school_two) { create(:school) }

    before do
      create(:school_billing_settings, school: school_two, overdue_grace_days: 5)
    end

    it "applies each school's grace window independently" do
      # Wednesday, two days before the reference Friday: past a 0-day grace, inside a 5-day one.
      charge_one = create(:charge, school: school, contract: contract, guardian: guardian,
                                 due_date: today - 2)
      contract_two = create(:contract, school: school_two, student: create(:student, school: school_two),
                                       billing_plan: create(:billing_plan, school: school_two))
      charge_two = create(:charge, school: school_two, contract: contract_two,
                                   guardian: create(:guardian, school: school_two),
                                   due_date: today - 2)

      described_class.call

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

    # Between 21:00 and midnight in Sao Paulo the UTC calendar is already on the next day.
    # Reading the boundary in UTC marks the charge overdue on its own due date, which bills a
    # late fee and fires the collection notice a day early.
    it "does not mark a charge overdue on its due date late in the school evening" do
      charge = create(:charge, school: school, contract: contract, guardian: guardian,
                               due_date: Date.new(2026, 8, 8)) # Saturday -> effective Monday Aug 10

      travel_to Time.utc(2026, 8, 11, 0, 30, 0) do # Aug 10 21:30 in America/Sao_Paulo
        described_class.call(school: school)

        expect(charge.reload.status).to eq("pending")
      end
    end
  end

  context "with charges in other states" do
    include_context "with the clock pinned to the reference Friday"

    it "only marks kept pending charges overdue" do
      school.school_billing_settings&.destroy
      create(:school_billing_settings, school: school, overdue_grace_days: 0)
      pending = create(:charge, school: school, contract: contract, guardian: guardian, due_date: today - 4)
      paid = create(:charge, :paid, school: school, contract: contract, guardian: guardian,
                                     due_date: today - 4)
      cancelled = create(:charge, :cancelled, school: school, contract: contract, guardian: guardian,
                                              due_date: today - 4)
      discarded = create(:charge, school: school, contract: contract, guardian: guardian, due_date: today - 4)
      discarded.discard!

      described_class.call(school: school)

      expect(pending.reload.status).to eq("overdue")
      expect(paid.reload.status).to eq("paid")
      expect(cancelled.reload.status).to eq("cancelled")
      expect(discarded.reload.status).to eq("pending")
    end
  end
end
