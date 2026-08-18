# frozen_string_literal: true

require "rails_helper"

RSpec.describe UserIdentity do
  it "requires core attributes" do
    identity = build(:user_identity, provider: nil)

    expect(identity).not_to be_valid
    expect(identity.errors[:provider]).to be_present
  end

  it "accepts only supported providers" do
    identity = build(:user_identity, provider: "apple")

    expect(identity).not_to be_valid
    expect(identity.errors[:provider]).to be_present
  end

  it "rejects duplicate provider_uid for the same provider" do
    create(:user_identity, provider_uid: "sub-123")
    duplicate = build(:user_identity, provider_uid: "sub-123")

    expect(duplicate).not_to be_valid
    expect(duplicate.errors[:provider_uid]).to be_present
  end
end
