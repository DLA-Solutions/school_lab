# frozen_string_literal: true

require "rails_helper"

RSpec.describe Auth::GoogleLoginService do
  subject(:result) do
    described_class.call(
      id_token: "valid-token",
      remember_me: true,
      client: "web",
      verifier: verifier
    )
  end

  let(:user) { create(:user, email: "staff@example.com") }
  let(:claims) do
    SchoolLab::Integrations::Google::IdTokenVerifier::TokenClaims.new(
      sub: "google-sub-123",
      email: user.email,
      email_verified: true
    )
  end
  let(:verifier) { instance_double(SchoolLab::Integrations::Google::IdTokenVerifier, verify: claims) }

  before { create(:membership, :staff, user: user) }

  it "issues tokens for an eligible user" do
    expect(result).to be_success
    expect(result.data[:access_token]).to be_present
    expect(result.data[:refresh_token]).to be_present
    expect(UserIdentity.find_by(provider: "google", provider_uid: "google-sub-123")).to be_present
  end

  context "when token verification fails" do
    let(:verifier) do
      instance_double(SchoolLab::Integrations::Google::IdTokenVerifier).tap do |double|
        allow(double).to receive(:verify).and_raise(SchoolLab::Integrations::Google::InvalidTokenError)
      end
    end

    it "returns invalid_oauth_token" do
      expect(result).to be_failure
      expect(result.error_code).to eq(:invalid_oauth_token)
    end
  end
end
