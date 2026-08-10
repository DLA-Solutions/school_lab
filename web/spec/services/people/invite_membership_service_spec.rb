# frozen_string_literal: true

require "rails_helper"

RSpec.describe People::InviteMembershipService do
  include ActiveJob::TestHelper

  subject(:result) { described_class.call(membership: membership, inviter: inviter) }

  let(:school) { create(:school) }
  let(:inviter) { create(:user) }
  let(:membership) { create(:membership, :invited, school: school) }
  let!(:existing_token) { create(:membership_invite_token, membership: membership) }

  it "invalidates the previous token, issues a new one, and enqueues notification" do
    expect(result).to be_success
    expect(existing_token.reload.used_at).to be_present
    expect(membership.membership_invite_tokens.unused.count).to eq(1)
    expect(People::InviteMembershipNotificationJob).to have_been_enqueued.with(membership.id, kind_of(String))
  end

  context "when membership is active" do
    let(:membership) { create(:membership, school: school, status: "active") }
    let!(:existing_token) { nil }

    it "returns validation_error" do
      expect(result).to be_failure
      expect(result.error_code).to eq(:validation_error)
    end
  end
end
