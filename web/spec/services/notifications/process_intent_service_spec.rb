# frozen_string_literal: true

require "rails_helper"

RSpec.describe Notifications::ProcessIntentService do
  let(:school) { create(:school) }
  let(:target_user) { create(:user) }
  let(:other_target_user) { create(:user) }
  let(:payload) { { "title" => "Boletim disponível", "body" => "O boletim de Pedro já está disponível." } }

  def call(user_ids: [ target_user.id ], source_id: 1)
    described_class.call(
      school: school,
      channel_key: "report_cards",
      source_type: "ReportCardSnapshot",
      source_id: source_id,
      target_user_ids: user_ids,
      payload: payload
    )
  end

  context "when push is enabled for the channel (the BR-N03 default — no policy override persisted)" do
    it "creates the intent and one queued push delivery per target user, enqueuing a job for each" do
      result = nil

      expect do
        result = call(user_ids: [ target_user.id, other_target_user.id ])
      end.to change(NotificationIntent, :count).by(1)
        .and change(NotificationDelivery, :count).by(2)
        .and have_enqueued_job(Notifications::SendPushNotificationJob).twice

      expect(result).to be_success
      intent = NotificationIntent.find(result.data[:intent_id])
      expect(intent.school).to eq(school)
      expect(intent.payload).to eq(payload)

      deliveries = NotificationDelivery.where(id: result.data[:delivery_ids])
      expect(deliveries.pluck(:user_id)).to match_array([ target_user.id, other_target_user.id ])
      expect(deliveries.map(&:channel).uniq).to eq([ "push" ])
      expect(deliveries).to all(be_queued)
    end

    it "deduplicates repeated target user ids" do
      call(user_ids: [ target_user.id, target_user.id ])

      expect(NotificationDelivery.where(user_id: target_user.id).count).to eq(1)
    end
  end

  context "when push is disabled for the channel (staff override, BR-N02)" do
    before { create(:notification_policy, :push_disabled, school: school, channel_key: "report_cards") }

    it "creates the delivery already skipped and enqueues no job" do
      result = nil

      expect do
        result = call
      end.to change(NotificationDelivery, :count).by(1)
        .and change { enqueued_send_push_job_count }.by(0)

      expect(result).to be_success
      delivery = NotificationDelivery.find(result.data[:delivery_ids].first)
      expect(delivery).to be_skipped
    end
  end

  context "when the same source event is processed twice (BR-N05, AC-N03)" do
    it "is a no-op the second time — no duplicate intent, deliveries or jobs" do
      first_result = call(source_id: 42)
      second_result = nil

      expect do
        second_result = call(source_id: 42)
      end.to change(NotificationIntent, :count).by(0)
        .and change(NotificationDelivery, :count).by(0)
        .and change { enqueued_send_push_job_count }.by(0)

      expect(second_result).to be_success
      expect(second_result.data[:intent_id]).to eq(first_result.data[:intent_id])
      expect(second_result.data[:delivery_ids]).to eq([])
    end
  end

  def enqueued_send_push_job_count
    SolidQueue::Job.where(class_name: Notifications::SendPushNotificationJob.name).count
  end
end
