# frozen_string_literal: true

require "rails_helper"

RSpec.describe Auth::LinkOrResolveIdentityService do
  subject(:result) do
    described_class.call(
      provider: "google",
      provider_uid: provider_uid,
      email: email,
      email_verified: email_verified,
      now: frozen_time
    )
  end

  let(:frozen_time) { Time.zone.parse("2026-08-18 12:00:00") }
  let(:provider_uid) { "google-sub-123" }
  let(:email) { user.email }
  let(:email_verified) { true }
  let(:user) { create(:user, email: "maria@example.com") }

  context "when linking a google identity for the first time" do
    it "creates the identity row" do
      expect(result).to be_success
      identity = result.data[:identity]
      expect(identity.provider).to eq("google")
      expect(identity.provider_uid).to eq(provider_uid)
      expect(identity.email).to eq(email)
      expect(identity.linked_at).to eq(frozen_time)
      expect(identity.last_used_at).to eq(frozen_time)
    end
  end

  context "when the google sub already exists" do
    let!(:identity) do
      create(:user_identity, :google, user: user, provider_uid: provider_uid, last_used_at: 1.day.ago)
    end

    it "updates last_used_at and email snapshot" do
      expect(result).to be_success
      expect(result.data[:identity].id).to eq(identity.id)
      expect(identity.reload.last_used_at).to eq(frozen_time)
    end
  end

  context "when email does not match the linked user" do
    let!(:identity) do
      create(:user_identity, :google, user: user, provider_uid: provider_uid, email: user.email)
    end
    let(:email) { "other@example.com" }

    it "denies access generically" do
      expect(result).to be_failure
      expect(result.error_code).to eq(:access_denied)
    end
  end

  context "when no user exists for the email" do
    let(:email) { "unknown@example.com" }

    it "denies access generically" do
      expect(result).to be_failure
      expect(result.error_code).to eq(:access_denied)
    end
  end

  context "when email is not verified" do
    let(:email_verified) { false }

    it "denies access generically" do
      expect(result).to be_failure
      expect(result.error_code).to eq(:access_denied)
    end
  end

  context "when another google sub is already linked to the user" do
    before do
      create(:user_identity, :google, user: user, provider_uid: "existing-sub")
    end

    it "denies access generically" do
      expect(result).to be_failure
      expect(result.error_code).to eq(:access_denied)
    end
  end
end
