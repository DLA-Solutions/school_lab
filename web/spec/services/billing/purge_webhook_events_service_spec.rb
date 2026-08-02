# frozen_string_literal: true

require "rails_helper"

RSpec.describe Billing::PurgeWebhookEventsService do
  include ActiveSupport::Testing::TimeHelpers

  let(:as_of) { Time.zone.parse("2026-08-02 12:00:00") }

  around do |example|
    travel_to(as_of) { example.run }
  end

  it "deletes processed rows older than the retention window" do
    create(:webhook_event, processed_at: 200.days.ago)
    recent = create(:webhook_event, processed_at: 10.days.ago)
    unprocessed = create(:webhook_event, processed_at: nil, created_at: 400.days.ago)

    result = described_class.call(retention_days: 180, as_of: as_of)

    expect(result).to be_success
    expect(result.data[:deleted_count]).to eq(1)
    expect(WebhookEvent.pluck(:id)).to contain_exactly(recent.id, unprocessed.id)
  end

  it "uses the configured default retention window" do
    create(:webhook_event, processed_at: 200.days.ago)

    result = described_class.call(as_of: as_of)

    expect(result.data[:deleted_count]).to eq(1)
  end
end
