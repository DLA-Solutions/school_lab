# frozen_string_literal: true

require "rails_helper"

RSpec.describe Billing::ProcessCollectionRemindersService do
  include ActiveSupport::Testing::TimeHelpers

  let(:school) { create(:school) }
  let(:guardian) { create(:guardian, school: school, email: "guardian@example.com") }
  let(:student) { create(:student, school: school) }
  let(:billing_plan) { create(:billing_plan, school: school) }
  let(:contract) { create(:contract, school: school, student: student, billing_plan: billing_plan) }
  let(:today) { Date.new(2026, 8, 8) }

  around do |example|
    original_token = ENV["POSTMARK_API_TOKEN"]
    ENV["POSTMARK_API_TOKEN"] = "test-token"
    travel_to(Time.utc(2026, 8, 8, 15, 0, 0)) { example.run }
    ENV["POSTMARK_API_TOKEN"] = original_token
  end

  before do
    create(
      :school_billing_settings,
      school: school,
      notification_schedule: {
        "reminders" => [
          { "days_before_due" => 3 },
          { "days_after_due" => 7 }
        ]
      }
    )
  end

  it "sends pre-due reminders for pending charges" do
    charge = create(
      :charge,
      school: school,
      contract: contract,
      guardian: guardian,
      due_date: today + 3.days
    )

    expect do
      described_class.call(school: school)
    end.to have_enqueued_job(ActionMailer::MailDeliveryJob)

    expect(CollectionReminderDelivery.last.rule_key).to eq("days_before_due:3")
    expect(CollectionReminderDelivery.last.charge).to eq(charge)
  end

  it "sends post-due reminders for overdue charges" do
    charge = create(
      :charge,
      school: school,
      contract: contract,
      guardian: guardian,
      due_date: today - 7.days
    )
    charge.mark_overdue!

    expect do
      described_class.call(school: school)
    end.to have_enqueued_job(ActionMailer::MailDeliveryJob)

    expect(CollectionReminderDelivery.last.rule_key).to eq("days_after_due:7")
    expect(CollectionReminderDelivery.last.charge).to eq(charge)
  end
end
