# frozen_string_literal: true

require "rails_helper"

RSpec.describe Identity::IssueMembershipInviteTokenService do
  subject(:result) { described_class.call(membership: membership, inviter: inviter) }

  let(:school) { create(:school) }
  let(:inviter) { create(:user) }
  let(:membership) { create(:membership, :invited, school: school) }

  it "creates a token with digest and expiry" do
    expect(result).to be_success

    raw_token = result.data[:raw_token]
    token_record = result.data[:token]

    expect(raw_token).to be_present
    expect(token_record).to have_attributes(
      membership_id: membership.id,
      school_id: school.id,
      created_by_id: inviter.id
    )
    expect(token_record.token_digest).to eq(described_class.digest(raw_token))
    expect(token_record.expires_at).to be > Time.current
  end

  it "invalidates previous unused tokens for the membership" do
    previous = create(:membership_invite_token, membership: membership)

    expect(result).to be_success
    expect(previous.reload.used_at).to be_present
    expect(membership.membership_invite_tokens.unused.count).to eq(1)
  end

  context "when membership is active" do
    let(:membership) { create(:membership, school: school, status: "active") }

    it "returns validation_error" do
      expect(result).to be_failure
      expect(result.error_code).to eq(:validation_error)
    end
  end
end
