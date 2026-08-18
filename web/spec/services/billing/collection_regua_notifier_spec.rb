# frozen_string_literal: true

require "rails_helper"

RSpec.describe Billing::CollectionReguaNotifier do
  include ActiveSupport::Testing::TimeHelpers

  let(:school) { create(:school) }
  let(:guardian) { create(:guardian, school: school, email: "guardian@example.com") }
  let(:student) { create(:student, school: school) }
  let(:billing_plan) { create(:billing_plan, school: school) }
  let(:contract) { create(:contract, school: school, student: student, billing_plan: billing_plan) }
  let(:today) { Date.new(2026, 8, 11) }

  around do |example|
    travel_to(Time.utc(2026, 8, 11, 15, 0, 0)) { example.run }
  end

  before do
    create(
      :school_billing_settings,
      school: school,
      overdue_grace_days: 0,
      notification_schedule: {
        "reminders" => [
          { "days_after_due" => 3 }
        ]
      }
    )
  end

  describe ".notify_overdue" do
    it "enqueues a collection reminder when a post-due rule matches today" do
      charge = create(
        :charge,
        school: school,
        contract: contract,
        guardian: guardian,
        due_date: today - 3.days,
        boleto_url: "https://boleto.example/123",
        pix_copy_paste: "00020126580014BR"
      )
      charge.mark_overdue!

      expect do
        described_class.notify_overdue(charge: charge)
      end.to have_enqueued_job(ActionMailer::MailDeliveryJob)

      delivery = CollectionReminderDelivery.last
      expect(delivery.charge).to eq(charge)
      expect(delivery.rule_key).to eq("days_after_due:3")
      expect(delivery.sent_on).to eq(today)
    end

    it "does not enqueue duplicate emails for the same charge and rule on the same day" do
      charge = create(
        :charge,
        school: school,
        contract: contract,
        guardian: guardian,
        due_date: today - 3.days
      )
      charge.mark_overdue!

      described_class.notify_overdue(charge: charge)

      expect do
        described_class.notify_overdue(charge: charge)
      end.not_to have_enqueued_job(ActionMailer::MailDeliveryJob)
    end

    it "falls back to overdue_transition when no schedule rule matches today" do
      charge = create(
        :charge,
        school: school,
        contract: contract,
        guardian: guardian,
        due_date: today - 1.day
      )
      charge.mark_overdue!

      expect do
        described_class.notify_overdue(charge: charge)
      end.to have_enqueued_job(ActionMailer::MailDeliveryJob)

      expect(CollectionReminderDelivery.last.rule_key).to eq("overdue_transition")
    end

    it "does nothing when email delivery is not configured" do
      allow(SchoolLab::EmailDelivery).to receive(:configured?).and_return(false)
      charge = create(
        :charge,
        school: school,
        contract: contract,
        guardian: guardian,
        due_date: today - 3.days
      )
      charge.mark_overdue!

      expect do
        described_class.notify_overdue(charge: charge)
      end.not_to have_enqueued_job(ActionMailer::MailDeliveryJob)
    end
  end
end
