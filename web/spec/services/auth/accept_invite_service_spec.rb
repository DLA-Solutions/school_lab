# frozen_string_literal: true

require "rails_helper"

RSpec.describe Auth::AcceptInviteService do
  subject(:result) do
    described_class.call(
      token: token,
      password: password,
      name: name
    )
  end

  let(:school) { create(:school) }
  let(:password) { "new-password-123" }
  let(:name) { "Maria Silva" }
  let(:raw_token) { SecureRandom.urlsafe_base64(32) }
  let(:membership) { create(:membership, :invited, school: school) }
  let!(:invite_token) do
    create(
      :membership_invite_token,
      membership: membership,
      school: school,
      token_digest: Identity::IssueMembershipInviteTokenService.digest(raw_token)
    )
  end
  let(:token) { raw_token }

  before do
    membership.user.update_columns(encrypted_password: "")
  end

  it "sets the user password and marks the token used" do
    expect(result).to be_success
    expect(result.data).to eq(user_id: membership.user_id, membership_id: membership.id)

    membership.user.reload
    expect(membership.user.valid_password?(password)).to be(true)
    expect(invite_token.reload.used_at).to be_present
  end

  context "when the invitee already has a password" do
    before do
      membership.user.update!(password: "existing-password-123", password_confirmation: "existing-password-123")
    end

    it "accepts without name" do
      expect(result).to be_success
      expect(membership.user.reload.valid_password?(password)).to be(true)
    end
  end

  context "when the user has no password and name is missing" do
    let(:name) { nil }

    it "returns validation_error" do
      expect(result).to be_failure
      expect(result.error_code).to eq(:validation_error)
      expect(result.details).to include(name: [ "can't be blank" ])
    end
  end

  context "when name is provided for a passwordless user" do
    it "accepts the invite" do
      expect(result).to be_success
    end
  end

  context "when the token is expired" do
    before { invite_token.update!(expires_at: 1.day.ago) }

    it "returns invalid_invite_token" do
      expect(result).to be_failure
      expect(result.error_code).to eq(:invalid_invite_token)
    end
  end

  context "when the token was already used" do
    before { invite_token.update!(used_at: 1.hour.ago) }

    it "returns invalid_invite_token" do
      expect(result).to be_failure
      expect(result.error_code).to eq(:invalid_invite_token)
    end
  end

  context "when the token is unknown" do
    let(:token) { "unknown-token" }

    it "returns invalid_invite_token" do
      expect(result).to be_failure
      expect(result.error_code).to eq(:invalid_invite_token)
    end
  end
end
