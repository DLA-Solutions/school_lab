# frozen_string_literal: true

require "rails_helper"

RSpec.describe Incidents::IncidentPublishedJob, type: :job do
  let(:school) { create(:school) }
  let(:student) { create(:student, school: school, name: "Pedro Silva") }
  let(:incident) { create(:incident, :published, school: school, student: student) }

  it "fans out a push notification intent to every guardian with a linked user account" do
    guardian_with_account = create(:guardian, school: school, user: create(:user))
    create(:student_guardian, school: school, student: student, guardian: guardian_with_account)

    expect do
      described_class.perform_now(incident.id, school.id)
    end.to change(NotificationIntent, :count).by(1)
      .and change(NotificationDelivery, :count).by(1)
      .and have_enqueued_job(Notifications::SendPushNotificationJob).once

    intent = NotificationIntent.last
    expect(intent.school).to eq(school)
    expect(intent.channel_key).to eq("incidents")
    expect(intent.source_type).to eq("Incident")
    expect(intent.source_id).to eq(incident.id)
    expect(intent.payload["title"]).to eq("Nova ocorrência registrada")
    expect(intent.payload["body"]).to include("Pedro Silva")

    delivery = NotificationDelivery.last
    expect(delivery.user).to eq(guardian_with_account.user)
    expect(delivery.channel).to eq("push")
  end

  it "skips a guardian with no linked platform account (BR-N09 scope) without error" do
    create(:guardian, school: school) # user: nil — no platform account to notify

    expect do
      described_class.perform_now(incident.id, school.id)
    end.not_to change(NotificationIntent, :count)
  end

  it "notifies only guardians with an account when the student has a mix of linked and unlinked guardians" do
    with_account = create(:guardian, school: school, user: create(:user))
    without_account = create(:guardian, school: school)
    create(:student_guardian, school: school, student: student, guardian: with_account, primary_guardian: true)
    create(:student_guardian, school: school, student: student, guardian: without_account, primary_guardian: false)

    described_class.perform_now(incident.id, school.id)

    expect(NotificationDelivery.pluck(:user_id)).to eq([ with_account.user_id ])
  end

  it "does not raise when the school is missing" do
    expect { described_class.perform_now(incident.id, -1) }.not_to raise_error
  end

  it "does not raise when the incident is missing" do
    expect { described_class.perform_now(-1, school.id) }.not_to raise_error
  end
end
