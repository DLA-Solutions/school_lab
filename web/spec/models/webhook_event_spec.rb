# frozen_string_literal: true

require "rails_helper"

RSpec.describe WebhookEvent, type: :model do
  describe "uniqueness per provider" do
    it "allows the same provider_event_id for different providers" do
      create(:webhook_event, provider: "cora", provider_event_id: "evt-shared")
      duplicate = build(:webhook_event, provider: "fake", provider_event_id: "evt-shared")

      expect(duplicate).to be_valid
      expect { duplicate.save! }.not_to raise_error
    end

    it "rejects duplicate provider_event_id for the same provider" do
      create(:webhook_event, provider: "cora", provider_event_id: "evt-dup")
      timestamp = Time.current

      expect do
        WebhookEvent.insert!({
                               provider: "cora",
                               provider_event_id: "evt-dup",
                               event_type: "payment.confirmed",
                               payload: "{}",
                               created_at: timestamp,
                               updated_at: timestamp
                             })
      end.to raise_error(ActiveRecord::RecordNotUnique)
    end
  end
end
