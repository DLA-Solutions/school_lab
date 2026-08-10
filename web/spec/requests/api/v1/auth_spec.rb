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

  path "/api/v1/auth/invite/accept" do
    post "Accept invite token" do
      tags "Auth"
      consumes "application/json"
      produces "application/json"
      parameter name: :payload, in: :body, schema: {
        type: :object,
        properties: {
          token: { type: :string },
          password: { type: :string },
          name: { type: :string }
        },
        required: %w[token password]
      }

      response "200", "password set from invite token" do
        let(:school) { create(:school) }
        let(:invited_user) { create(:user, email: "invitee@example.com") }
        let!(:invited_membership) { create(:membership, :invited, user: invited_user, school: school) }
        let(:raw_token) { SecureRandom.urlsafe_base64(32) }
        let!(:invite_token) do
          create(
            :membership_invite_token,
            membership: invited_membership,
            school: school,
            token_digest: Identity::IssueMembershipInviteTokenService.digest(raw_token)
          )
        end
        let(:payload) do
          {
            token: raw_token,
            password: "invite-password-123",
            name: "Maria Silva"
          }
        end

        before do
          invited_user.update_columns(encrypted_password: "")
        end

        run_test! do |response|
          body = JSON.parse(response.body).fetch("data")
          expect(body["user_id"]).to eq(invited_user.id)
          expect(body["membership_id"]).to eq(invited_membership.id)
          expect(invited_user.reload.valid_password?("invite-password-123")).to be(true)
          expect(invite_token.reload.used_at).to be_present
        end
      end

      response "401", "invalid invite token" do
        let(:payload) { { token: "invalid-token", password: "invite-password-123" } }

        run_test! do |response|
          body = JSON.parse(response.body).fetch("error")
          expect(body["code"]).to eq("invalid_invite_token")
        end
      end

      response "422", "name required for passwordless user" do
        let(:school) { create(:school) }
        let(:invited_user) { create(:user, email: "noname@example.com") }
        let!(:invited_membership) { create(:membership, :invited, user: invited_user, school: school) }
        let(:raw_token) { SecureRandom.urlsafe_base64(32) }
        let!(:invite_token) do
          create(
            :membership_invite_token,
            membership: invited_membership,
            school: school,
            token_digest: Identity::IssueMembershipInviteTokenService.digest(raw_token)
          )
        end
        let(:payload) { { token: raw_token, password: "invite-password-123" } }

        before do
          invited_user.update_columns(encrypted_password: "")
        end

        run_test! do |response|
          body = JSON.parse(response.body).fetch("error")
          expect(body["code"]).to eq("validation_error")
          expect(body["details"]).to include("name")
        end
      end
    end
  end
end
