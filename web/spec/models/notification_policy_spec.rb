# frozen_string_literal: true

require "rails_helper"

RSpec.describe NotificationPolicy do
  it "requires a channel_key" do
    policy = build(:notification_policy, channel_key: nil)

    expect(policy).not_to be_valid
    expect(policy.errors[:channel_key]).to be_present
  end

  it "rejects a second policy for the same school and channel_key" do
    school = create(:school)
    create(:notification_policy, school: school, channel_key: "report_cards")

    duplicate = build(:notification_policy, school: school, channel_key: "report_cards")

    expect(duplicate).not_to be_valid
    expect(duplicate.errors[:channel_key]).to be_present
  end

  it "allows the same channel_key in a different school" do
    create(:notification_policy, school: create(:school), channel_key: "report_cards")

    other = build(:notification_policy, school: create(:school), channel_key: "report_cards")

    expect(other).to be_valid
  end

  describe ".effective_for" do
    it "returns the persisted override when staff configured one" do
      school = create(:school)
      create(:notification_policy, :push_disabled, school: school, channel_key: "report_cards")

      effective = NotificationPolicy.effective_for(school: school, channel_key: "report_cards")

      expect(effective).to be_persisted
      expect(effective.push_enabled).to be(false)
    end

    it "falls back to the BR-N03 MVP default when no override exists" do
      school = create(:school)

      effective = NotificationPolicy.effective_for(school: school, channel_key: "messages")

      expect(effective).not_to be_persisted
      expect(effective.push_enabled).to be(true)
      expect(effective.email_enabled).to be(false)
      expect(effective.whatsapp_enabled).to be(false)
    end

    it "defaults even a channel_key nobody has declared yet" do
      effective = NotificationPolicy.effective_for(school: create(:school), channel_key: "unheard_of")

      expect(effective.push_enabled).to be(true)
    end
  end

  describe "#enabled?" do
    it "reads the toggle for the given channel" do
      policy = build(:notification_policy, push_enabled: true, email_enabled: false, whatsapp_enabled: false)

      expect(policy.enabled?("push")).to be(true)
      expect(policy.enabled?(:email)).to be(false)
      expect(policy.enabled?("whatsapp")).to be(false)
    end

    it "is false for an unknown channel" do
      policy = build(:notification_policy)

      expect(policy.enabled?("sms")).to be(false)
    end
  end
end
