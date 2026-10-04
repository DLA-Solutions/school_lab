# frozen_string_literal: true

require "rails_helper"

RSpec.describe DailyRoutineEntries::RoutineSentJob, type: :job do
  let(:school) { create(:school) }
  let(:student) { create(:student, school: school, name: "Pedro Silva") }
  let(:entry) { create(:daily_routine_entry, :sent, school: school, student: student) }

  it "fans out a push notification intent to every guardian with a linked user account" do
    guardian_with_account = create(:guardian, school: school, user: create(:user))
    create(:student_guardian, school: school, student: student, guardian: guardian_with_account)

    expect do
      described_class.perform_now(entry.id, school.id)
    end.to change(NotificationIntent, :count).by(1)
      .and change(NotificationDelivery, :count).by(1)
      .and have_enqueued_job(Notifications::SendPushNotificationJob).once

    intent = NotificationIntent.last
    expect(intent.school).to eq(school)
    expect(intent.channel_key).to eq("daily_routine")
    expect(intent.source_type).to eq("DailyRoutineEntry")
    expect(intent.source_id).to eq(entry.id)
    expect(intent.payload["body"]).to include("Pedro Silva")

    delivery = NotificationDelivery.last
    expect(delivery.user).to eq(guardian_with_account.user)
    expect(delivery.channel).to eq("push")
  end

  it "skips a guardian with no linked platform account (BR-N09 scope) without error" do
    create(:guardian, school: school) # user: nil — no platform account to notify

    expect do
      described_class.perform_now(entry.id, school.id)
    end.not_to change(NotificationIntent, :count)
  end

  it "does not raise when the school is missing" do
    expect { described_class.perform_now(entry.id, -1) }.not_to raise_error
  end

  it "does not raise when the entry is missing" do
    expect { described_class.perform_now(-1, school.id) }.not_to raise_error
  end
end
