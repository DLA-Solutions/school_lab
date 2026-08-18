# frozen_string_literal: true

require "rails_helper"

RSpec.describe UserIdentity do
  subject(:identity) { build(:user_identity) }

  it { is_expected.to belong_to(:user) }
  it { is_expected.to validate_presence_of(:provider) }
  it { is_expected.to validate_presence_of(:provider_uid) }
  it { is_expected.to validate_presence_of(:email) }
  it { is_expected.to validate_presence_of(:linked_at) }
  it { is_expected.to validate_inclusion_of(:provider).in_array(%w[google]) }

  it "rejects duplicate provider_uid for the same provider" do
    create(:user_identity, provider_uid: "sub-123")
    duplicate = build(:user_identity, provider_uid: "sub-123")

    expect(duplicate).not_to be_valid
    expect(duplicate.errors[:provider_uid]).to be_present
  end
end
