# frozen_string_literal: true

require "rails_helper"

RSpec.describe Guardian do
  it "requires a name" do
    guardian = build(:guardian, name: nil)

    expect(guardian).not_to be_valid
    expect(guardian.errors[:name]).to be_present
  end
end
