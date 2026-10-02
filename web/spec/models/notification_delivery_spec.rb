# frozen_string_literal: true

require "rails_helper"

RSpec.describe NotificationDelivery do
  it "rejects an unknown channel" do
    delivery = build(:notification_delivery, channel: "carrier_pigeon")

    expect(delivery).not_to be_valid
    expect(delivery.errors[:channel]).to be_present
  end

  it "rejects a second delivery for the same intent, channel and user (idempotent delivery)" do
    intent = create(:notification_intent)
    user = create(:user)
    create(:notification_delivery, notification_intent: intent, school: intent.school, user: user, channel: "push")

    duplicate = build(:notification_delivery, notification_intent: intent, school: intent.school, user: user,
                                               channel: "push")

    expect(duplicate).not_to be_valid
    expect(duplicate.errors[:user_id]).to be_present
  end

  it "allows the same user on a different channel for the same intent" do
    intent = create(:notification_intent)
    user = create(:user)
    create(:notification_delivery, notification_intent: intent, school: intent.school, user: user, channel: "push")

    other = build(:notification_delivery, notification_intent: intent, school: intent.school, user: user,
                                           channel: "email")

    expect(other).to be_valid
  end

  describe "state machine" do
    it "starts queued" do
      expect(create(:notification_delivery)).to be_queued
    end

    it "moves to sent and stamps sent_at" do
      delivery = create(:notification_delivery)

      delivery.deliver!

      expect(delivery).to be_sent
      expect(delivery.sent_at).to be_present
    end

    it "moves to failed and keeps the error_code set alongside the transition" do
      delivery = create(:notification_delivery)

      delivery.error_code = "adapter_unavailable"
      delivery.fail!

      expect(delivery).to be_failed
      expect(delivery.error_code).to eq("adapter_unavailable")
    end

    it "moves to skipped when policy is off" do
      delivery = create(:notification_delivery)

      delivery.skip!

      expect(delivery).to be_skipped
    end

    it "refuses to transition out of a terminal state" do
      delivery = create(:notification_delivery, :sent)

      expect(delivery.may_deliver?).to be(false)
      expect(delivery.may_fail?).to be(false)
      expect(delivery.may_skip?).to be(false)
    end

    it "refuses writing status directly, only through events" do
      delivery = create(:notification_delivery)

      expect { delivery.update!(status: "sent") }.to raise_error(AASM::NoDirectAssignmentError)
    end
  end
end
