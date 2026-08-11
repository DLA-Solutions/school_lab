# frozen_string_literal: true

require "rails_helper"

RSpec.describe CollectionReminderDelivery do
  it "requires unique rule_key per charge and sent_on" do
    existing = create(:collection_reminder_delivery)
    duplicate = build(
      :collection_reminder_delivery,
      school: existing.school,
      charge: existing.charge,
      rule_key: existing.rule_key,
      sent_on: existing.sent_on
    )

    expect(duplicate).not_to be_valid
    expect(duplicate.errors[:rule_key]).to be_present
  end
end
