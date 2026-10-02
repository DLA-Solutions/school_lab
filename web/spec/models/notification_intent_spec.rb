# frozen_string_literal: true

require "rails_helper"

RSpec.describe NotificationIntent do
  it "requires channel_key and source_type" do
    intent = build(:notification_intent, channel_key: nil, source_type: nil)

    expect(intent).not_to be_valid
    expect(intent.errors[:channel_key]).to be_present
    expect(intent.errors[:source_type]).to be_present
  end

  it "rejects a second intent for the same source event and channel_key (idempotent fan-out)" do
    create(:notification_intent, source_type: "ReportCardSnapshot", source_id: 1, channel_key: "report_cards")

    duplicate = build(:notification_intent, source_type: "ReportCardSnapshot", source_id: 1,
                                             channel_key: "report_cards")

    expect(duplicate).not_to be_valid
    expect(duplicate.errors[:source_id]).to be_present
  end

  it "allows the same source event under a different channel_key" do
    create(:notification_intent, source_type: "ReportCardSnapshot", source_id: 1, channel_key: "report_cards")

    other = build(:notification_intent, source_type: "ReportCardSnapshot", source_id: 1, channel_key: "photos")

    expect(other).to be_valid
  end

  it "destroys its deliveries when destroyed" do
    intent = create(:notification_intent)
    delivery = create(:notification_delivery, notification_intent: intent, school: intent.school)

    intent.destroy!

    expect(NotificationDelivery.exists?(delivery.id)).to be(false)
  end
end
