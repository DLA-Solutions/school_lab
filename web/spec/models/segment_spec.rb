# frozen_string_literal: true

require "rails_helper"

RSpec.describe Segment do
  it "requires a name" do
    segment = build(:segment, name: nil)

    expect(segment).not_to be_valid
    expect(segment.errors[:name]).to be_present
  end

  it "enforces unique names per school among kept segments" do
    segment = create(:segment)
    duplicate = build(:segment, school: segment.school, name: segment.name)

    expect(duplicate).not_to be_valid
    expect(duplicate.errors[:name]).to be_present
  end

  it "allows the same name after discard" do
    segment = create(:segment)
    segment.discard!
    replacement = build(:segment, school: segment.school, name: segment.name)

    expect(replacement).to be_valid
  end
end
