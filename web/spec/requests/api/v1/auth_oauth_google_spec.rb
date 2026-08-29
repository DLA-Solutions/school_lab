# frozen_string_literal: true

require "swagger_helper"

RSpec.describe "Api::V1::Auth OAuth Google", type: :request do
  let(:client_id) { "test-google-client-id.apps.googleusercontent.com" }
  let(:claims) do
    SchoolLab::Integrations::Google::IdTokenVerifier::TokenClaims.new(
      sub: "google-sub-123",
      email: user.email,
      email_verified: true
    )
  end
  let(:verifier) { instance_double(SchoolLab::Integrations::Google::IdTokenVerifier, verify: claims) }

  before do
    allow(SchoolLab::Integrations::Google::IdTokenVerifier).to receive(:new).and_return(verifier)
  end

  path "/api/v1/auth/oauth/google" do
    post "Google login" do
      tags "Auth"
      consumes "application/json"
      produces "application/json"
      parameter name: :payload, in: :body, schema: {
        type: :object,
        properties: {
          id_token: { type: :string },
          remember_me: { type: :boolean },
          client: { type: :string, enum: %w[web mobile] }
        },
        required: %w[id_token]
      }

      response "200", "tokens issued" do
        let(:user) { create(:user, email: "staff@example.com") }
        let!(:membership) { create(:membership, :staff, user: user) }
        let(:payload) { { id_token: "valid-token", client: "mobile" } }

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body["access_token"]).to be_present
          expect(body["refresh_token"]).to be_present
          expect(body.dig("user", "email")).to eq(user.email)
          expect(UserIdentity.find_by(provider: "google", provider_uid: "google-sub-123")).to be_present
        end
      end

      response "200", "sets refresh cookie for web client" do
        let(:user) { create(:user, email: "web-staff@example.com") }
        let!(:membership) { create(:membership, :staff, user: user) }
        let(:payload) { { id_token: "valid-token", client: "web" } }

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body["access_token"]).to be_present
          expect(body["refresh_token"]).to be_nil
          expect(response.cookies["refresh_token"]).to be_present
        end
      end

      response "401", "invalid oauth token" do
        let(:user) { create(:user, email: "staff@example.com") }
        let(:payload) { { id_token: "bad-token" } }

        before do
          allow(verifier).to receive(:verify).and_raise(SchoolLab::Integrations::Google::InvalidTokenError)
        end

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.dig("error", "code")).to eq("invalid_oauth_token")
        end
      end

      response "403", "unknown email" do
        let(:user) { create(:user, email: "known@example.com") }
        let(:payload) { { id_token: "valid-token" } }

        before do
          allow(verifier).to receive(:verify).and_return(
            SchoolLab::Integrations::Google::IdTokenVerifier::TokenClaims.new(
              sub: "google-sub-unknown",
              email: "unknown@example.com",
              email_verified: true
            )
          )
        end

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.dig("error", "code")).to eq("access_denied")
        end
      end

      response "403", "guardian without enrolled child" do
        let(:user) { create(:user, email: "guardian@example.com") }
        let(:school) { create(:school) }
        let(:guardian) { create(:guardian, school: school, user: user, discarded_at: Time.current) }
        let(:student) { create(:student, school: school, status: "active") }
        let(:payload) { { id_token: "valid-token" } }

        before do
          create(:membership, user: user, school: school, role: "guardian", status: "active")
          create(:student_guardian, school: school, student: student, guardian: guardian)
        end

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.dig("error", "code")).to eq("access_denied")
        end
      end

      response "403", "disabled user" do
        let(:user) { create(:user, :disabled, email: "disabled@example.com") }
        let!(:membership) { create(:membership, :staff, user: user) }
        let(:payload) { { id_token: "valid-token" } }

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.dig("error", "code")).to eq("user_disabled")
        end
      end

      response "403", "invited staff membership" do
        let(:user) { create(:user, email: "invited-staff@example.com") }
        let!(:membership) { create(:membership, :staff, :invited, user: user) }
        let(:payload) { { id_token: "valid-token" } }

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.dig("error", "code")).to eq("access_denied")
          expect(UserIdentity.find_by(provider: "google", provider_uid: "google-sub-123")).to be_nil
        end
      end
    end
  end
end
