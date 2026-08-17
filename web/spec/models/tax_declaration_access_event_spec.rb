# frozen_string_literal: true

require "rails_helper"

RSpec.describe TaxDeclarationAccessEvent, type: :model do
  it "restricts event_type to known values" do
    event = build(:tax_declaration_access_event, event_type: "unknown")

    expect(event).not_to be_valid
    expect(event.errors[:event_type]).to be_present
  end
end
