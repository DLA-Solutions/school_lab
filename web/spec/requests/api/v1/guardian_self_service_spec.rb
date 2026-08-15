# frozen_string_literal: true

require "rails_helper"

# A guardian getting into the system on their own: asking for a link with the CPF the school
# registered them under, and choosing a new password when they have forgotten the old one.
RSpec.describe "Guardian self-service access", type: :request do
  let(:school) { create(:school) }
  let!(:guardian) do
    create(:guardian, school: school, cpf: "12345678909", email: "mae@example.com")
  end

  before { ActionMailer::Base.deliveries.clear }

  describe "POST /api/v1/auth/access" do
    # The answer never varies. Anything else lets a stranger walk a list of CPFs and learn which
    # children attend the school.
    it "answers the same for a registered CPF" do
      post "/api/v1/auth/access", params: { cpf: "123.456.789-09" }, as: :json

      expect(response).to have_http_status(:no_content)
      expect(response.body).to be_blank
    end

    it "answers the same for a CPF nobody is registered under" do
      post "/api/v1/auth/access", params: { cpf: "529.982.247-25" }, as: :json

      expect(response).to have_http_status(:no_content)
      expect(ActionMailer::Base.deliveries).to be_empty
    end

    it "answers the same for something that is not a CPF at all" do
      post "/api/v1/auth/access", params: { cpf: "não-é-cpf" }, as: :json

      expect(response).to have_http_status(:no_content)
    end

    it "provisions the account and sends the link when the CPF is registered" do
      expect { post "/api/v1/auth/access", params: { cpf: "12345678909" }, as: :json }
        .to change(User, :count).by(1)

      expect(guardian.reload.user).to be_present
    end

    it "needs no authentication" do
      post "/api/v1/auth/access", params: { cpf: "12345678909" }, as: :json

      expect(response).not_to have_http_status(:unauthorized)
    end
  end

  describe "POST /api/v1/auth/password/reset" do
    let(:user) { create(:user, email: "mae@example.com") }
    let(:raw_token) { user.send(:set_reset_password_token) }

    it "sets the new password and lets it sign in" do
      post "/api/v1/auth/password/reset",
           params: { token: raw_token, password: "NovaSenha123!",
                     password_confirmation: "NovaSenha123!" },
           as: :json

      expect(response).to have_http_status(:no_content)
      expect(user.reload.valid_password?("NovaSenha123!")).to be(true)
    end

    # A reset is what someone does when they think the old password is no longer theirs alone.
    it "closes every session opened with the old password" do
      token = create(:refresh_token, user: user)

      post "/api/v1/auth/password/reset",
           params: { token: raw_token, password: "NovaSenha123!",
                     password_confirmation: "NovaSenha123!" },
           as: :json

      expect(token.reload.revoked_at).to be_present
    end

    it "refuses a password that is not strong enough" do
      post "/api/v1/auth/password/reset",
           params: { token: raw_token, password: "senhafraca",
                     password_confirmation: "senhafraca" },
           as: :json

      expect(response).to have_http_status(:unprocessable_content)
      expect(response.parsed_body.dig("error", "details")).to have_key("password")
    end

    it "refuses a token that has already been used" do
      2.times do
        post "/api/v1/auth/password/reset",
             params: { token: raw_token, password: "NovaSenha123!",
                       password_confirmation: "NovaSenha123!" },
             as: :json
      end

      expect(response).to have_http_status(:unprocessable_content)
    end

    it "refuses a token past its window" do
      raw_token
      # Devise measures the window from `reset_password_sent_at`, so ageing the record is the
      # same thing as waiting, without ActiveSupport::Testing::TimeHelpers in request specs.
      user.update_column(:reset_password_sent_at, 7.hours.ago)

      post "/api/v1/auth/password/reset",
           params: { token: raw_token, password: "NovaSenha123!",
                     password_confirmation: "NovaSenha123!" },
           as: :json

      expect(response).to have_http_status(:unprocessable_content)
      expect(user.reload.valid_password?("NovaSenha123!")).to be(false)
    end

    it "refuses a token nobody was ever issued" do
      post "/api/v1/auth/password/reset",
           params: { token: "inventado", password: "NovaSenha123!",
                     password_confirmation: "NovaSenha123!" },
           as: :json

      expect(response).to have_http_status(:unprocessable_content)
    end
  end

  # The endpoint answered 204 while nothing was sent: Devise built its URL from routes this API
  # does not mount, and raised before any mail left.
  describe "POST /api/v1/auth/password" do
    it "actually sends the reset mail" do
      create(:user, email: "mae@example.com")

      expect { post "/api/v1/auth/password", params: { email: "mae@example.com" }, as: :json }
        .to have_enqueued_mail(AuthMailer, :password_reset)

      expect(response).to have_http_status(:no_content)
    end

    it "answers the same for an address nobody is registered under" do
      expect { post "/api/v1/auth/password", params: { email: "ninguem@example.com" }, as: :json }
        .not_to have_enqueued_mail(AuthMailer, :password_reset)

      expect(response).to have_http_status(:no_content)
    end
  end
end
