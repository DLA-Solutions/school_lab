# frozen_string_literal: true

require "rails_helper"

RSpec.describe MembershipInviteToken do
  describe "validations" do
    it "requires token_digest and expires_at" do
      token = build(:membership_invite_token, token_digest: nil, expires_at: nil)

      expect(token).not_to be_valid
      expect(token.errors[:token_digest]).to be_present
      expect(token.errors[:expires_at]).to be_present
    end

    it "enforces unique token_digest" do
      existing = create(:membership_invite_token)
      duplicate = build(:membership_invite_token, token_digest: existing.token_digest)

      expect(duplicate).not_to be_valid
      expect(duplicate.errors[:token_digest]).to be_present
    end

    it "allows at most one unused token per membership" do
      membership = create(:membership, :invited)
      create(:membership_invite_token, membership: membership)
      duplicate = build(:membership_invite_token, membership: membership)

      expect(duplicate).not_to be_valid
      expect(duplicate.errors[:membership_id]).to be_present
    end

    it "allows a new unused token after the previous one is used" do
      membership = create(:membership, :invited)
      create(:membership_invite_token, :used, membership: membership)
      replacement = build(:membership_invite_token, membership: membership)

      expect(replacement).to be_valid
    end
  end

  describe "#used?" do
    it "returns true when used_at is set" do
      expect(build(:membership_invite_token, :used)).to be_used
      expect(build(:membership_invite_token)).not_to be_used
    end
  end

  describe "#expired?" do
    it "returns true when expires_at is in the past" do
      expect(build(:membership_invite_token, :expired)).to be_expired
      expect(build(:membership_invite_token)).not_to be_expired
    end
  end

  describe ".active" do
    it "includes unused, unexpired tokens only" do
      active_token = create(:membership_invite_token)
      create(:membership_invite_token, :used)
      create(:membership_invite_token, :expired)

      expect(described_class.active).to contain_exactly(active_token)
    end
  end
end
