# frozen_string_literal: true

require "swagger_helper"

RSpec.describe "Api::V1::Auth", type: :request do
  let(:user) { create(:user, email: "maria@example.com") }
  let!(:membership) { create(:membership, user: user) }

  path "/api/v1/auth/login" do
    post "Login" do
      tags "Auth"
      consumes "application/json"
      produces "application/json"
      parameter name: :payload, in: :body, schema: {
        type: :object,
        properties: {
          email: { type: :string },
          password: { type: :string },
          remember_me: { type: :boolean },
          client: { type: :string, enum: %w[web mobile] }
        },
        required: %w[email password]
      }

      response "200", "tokens issued" do
        let(:payload) { { email: user.email, password: "password123", client: "mobile" } }

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body["access_token"]).to be_present
          expect(body["refresh_token"]).to be_present
          expect(body.dig("user", "email")).to eq(user.email)
          expect(body.to_s).not_to include("password123")
          expect(body.to_s).not_to include("encrypted_password")
        end
      end

      response "401", "invalid credentials" do
        let(:payload) { { email: user.email, password: "wrong" } }

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.dig("error", "code")).to eq("invalid_credentials")
        end
      end
    end
  end

  path "/api/v1/auth/refresh" do
    post "Refresh tokens" do
      tags "Auth"
      consumes "application/json"
      produces "application/json"
      parameter name: :payload, in: :body, schema: {
        type: :object,
        properties: {
          refresh_token: { type: :string }
        },
        required: %w[refresh_token]
      }

      response "200", "refresh rotated" do
        let(:login_response) do
          Auth::IssueTokensService.call(user: user).data
        end
        let(:old_refresh) { login_response[:refresh_token] }
        let(:payload) { { refresh_token: old_refresh } }

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body["access_token"]).to be_present
          expect(body["refresh_token"]).to be_present
          expect(body["refresh_token"]).not_to eq(old_refresh)

          digest = Digest::SHA256.hexdigest(old_refresh)
          expect(RefreshToken.find_by(token_digest: digest).revoked_at).to be_present
        end
      end
    end
  end
end
