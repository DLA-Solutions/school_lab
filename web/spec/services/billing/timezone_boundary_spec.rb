# frozen_string_literal: true

require "rails_helper"

# Every billing boundary — due dates, grace windows, alert windows, the monthly billing period,
# the reconciliation window — is a calendar date in the school's timezone, not an instant.
# Between 21:00 and midnight in Sao Paulo the UTC calendar already sits on the next day, so a
# boundary resolved in UTC moves: charges turn overdue on their own due date and the monthly
# period opens a month early. The rest of the suite runs at whatever time CI happens to fire,
# which is almost never inside that window, so these examples pin the clock there. Each one also
# asserts the verdict a UTC reading would reach, so an example can never quietly stop
# discriminating between the two.
RSpec.describe "billing boundaries in the school timezone" do
  include ActiveSupport::Testing::TimeHelpers

  # 2026-08-10 is a Monday and its week holds no national holiday, so BusinessDayCalendar rolls
  # none of the dates below and the examples do not depend on the real weekday.
  let(:late_evening) { Time.utc(2026, 8, 11, 0, 30, 0) } # Aug 10 21:30 in America/Sao_Paulo
  let(:local_today) { Date.new(2026, 8, 10) }
  let(:utc_today) { Date.new(2026, 8, 11) }

  let(:school) { create(:school) }
  let(:guardian) { create(:guardian, school: school) }
  let(:student) { create(:student, school: school) }
  let(:billing_plan) { create(:billing_plan, school: school) }
  let(:contract) { create(:contract, school: school, student: student, billing_plan: billing_plan) }

  def charge_due(date, total_amount_cents: 85_000)
    create(:charge, school: school, contract: contract, guardian: guardian, due_date: date,
                    total_amount_cents: total_amount_cents)
  end

  context "at 21:30 in the school timezone" do
    around { |example| travel_to(late_evening) { example.run } }

    it "resolves the current date on the school calendar, not the UTC one" do
      expect(Date.current).to eq(local_today)
      expect(Time.now.utc.to_date).to eq(utc_today)
    end

    it "leaves a charge pending on its own effective due date" do
      create(:school_billing_settings, school: school, overdue_grace_days: 0)
      charge = charge_due(local_today)

      Billing::MarkOverdueChargesService.call(school: school)

      expect(charge.reload.status).to eq("pending")
      expect(
        Billing::BusinessDayCalendar.overdue?(due_date: charge.due_date, grace_days: 0, as_of: utc_today)
      ).to be(true)
    end

    it "closes the grace window on the school calendar day" do
      create(:school_billing_settings, school: school, overdue_grace_days: 2)
      inside_grace = charge_due(local_today - 2)
      past_grace = charge_due(local_today - 3)

      Billing::MarkOverdueChargesService.call(school: school)

      expect(inside_grace.reload.status).to eq("pending")
      expect(past_grace.reload.status).to eq("overdue")
      expect(Billing::SchoolSettings.for(school).overdue_grace_cutoff).to eq(local_today - 2)
    end

    it "ends the unissued alert window on the school calendar day" do
      inside_window = charge_due(local_today + 7)
      outside_window = charge_due(local_today + 8)

      never_attempted = Billing::UnissuedCharges.for(school).fetch(:never_attempted)

      expect(never_attempted.map(&:id)).to include(inside_window.id)
      expect(never_attempted.map(&:id)).not_to include(outside_window.id)
      expect(outside_window.due_date).to eq(utc_today + 7)
    end

    it "opens the reconciliation window on the school calendar day" do
      config = create(:school_payment_provider, school: school)
      adapter = instance_double(Gateways::BankSlip::Fake, list_invoices: [])

      Billing::DailyReconciliationService.call(config: config, adapter: adapter)

      expect(adapter).to have_received(:list_invoices).with(
        since: local_today - Billing::DailyReconciliationService::RECONCILIATION_WINDOW_DAYS,
        limit: anything
      )
    end
  end

  context "at 22:00 on the last day of the month in the school timezone" do
    let(:month_end_evening) { Time.utc(2026, 9, 1, 1, 0, 0) } # Aug 31 22:00 in America/Sao_Paulo

    around { |example| travel_to(month_end_evening) { example.run } }

    it "opens the monthly billing period on the closing month" do
      config = create(:school_payment_provider, school: school)

      expect(Billing::GenerateChargesJob).to receive(:perform_later).with(
        school_id: config.school_id,
        billing_period: Date.new(2026, 8, 1)
      )

      Billing::MonthlyChargeGenerationJob.perform_now

      expect(Time.now.utc.to_date.beginning_of_month).to eq(Date.new(2026, 9, 1))
    end

    it "counts the expected collection against the closing month" do
      # Distinct amounts: with equal ones the assertion would hold whichever month the window
      # landed on.
      closing_month = charge_due(Date.new(2026, 8, 31), total_amount_cents: 85_000)
      next_month = charge_due(Date.new(2026, 9, 1), total_amount_cents: 42_000)

      result = Billing::SummaryService.call(school: school)

      expect(result.data.fetch(:expected_collection_this_month_cents)).to eq(closing_month.total_amount_cents)
      expect(next_month.due_date).to eq(Time.now.utc.to_date)
    end
  end
end
