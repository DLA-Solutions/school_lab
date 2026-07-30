# frozen_string_literal: true

require "rails_helper"

RSpec.describe User do
  it "is valid with default factory" do
    expect(build(:user)).to be_valid
  end

  it "rejects disabled status outside allowed values" do
    user = build(:user, status: "invalid")
    expect(user).not_to be_valid
  end
end
