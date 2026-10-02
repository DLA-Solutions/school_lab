# frozen_string_literal: true

require "rails_helper"

RSpec.describe ReportCards::ReportCardPublishedJob, type: :job do
  let(:school) { create(:school) }
  let(:student) { create(:student, school: school, name: "Pedro Silva") }
  let(:publication) { create(:report_card_publication, school: school, student: student) }
  let(:snapshot) { create(:report_card_snapshot, school: school, report_card_publication: publication) }

  it "fans out a push notification intent to every guardian with a linked user account" do
    guardian_with_account = create(:guardian, school: school, user: create(:user))
    create(:student_guardian, school: school, student: student, guardian: guardian_with_account)

    expect do
      described_class.perform_now(snapshot.id, school.id)
    end.to change(NotificationIntent, :count).by(1)
      .and change(NotificationDelivery, :count).by(1)
      .and have_enqueued_job(Notifications::SendPushNotificationJob).once

    intent = NotificationIntent.last
    expect(intent.school).to eq(school)
    expect(intent.channel_key).to eq("report_cards")
    expect(intent.source_type).to eq("ReportCardSnapshot")
    expect(intent.source_id).to eq(snapshot.id)
    expect(intent.payload["title"]).to eq("Boletim disponível")
    expect(intent.payload["body"]).to include("Pedro Silva")

    delivery = NotificationDelivery.last
    expect(delivery.user).to eq(guardian_with_account.user)
    expect(delivery.channel).to eq("push")
  end

  it "skips a guardian with no linked platform account (BR-N09 scope) without error" do
    create(:guardian, school: school) # user: nil — no platform account to notify

    expect do
      described_class.perform_now(snapshot.id, school.id)
    end.not_to change(NotificationIntent, :count)
  end

  it "notifies only guardians with an account when the student has a mix of linked and unlinked guardians" do
    with_account = create(:guardian, school: school, user: create(:user))
    without_account = create(:guardian, school: school)
    create(:student_guardian, school: school, student: student, guardian: with_account, primary_guardian: true)
    create(:student_guardian, school: school, student: student, guardian: without_account, primary_guardian: false)

    described_class.perform_now(snapshot.id, school.id)

    expect(NotificationDelivery.pluck(:user_id)).to eq([ with_account.user_id ])
  end
end
