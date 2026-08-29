# frozen_string_literal: true

require "rails_helper"

RSpec.describe AuthMailer do
  let(:user) { create(:user, email: "user@example.com") }
  let(:raw_token) { "reset-token-xyz" }

  describe "#password_reset" do
    subject(:mail) do
      described_class.with(user: user, raw_token: raw_token).password_reset
    end

    around do |example|
      original_host = ENV["APP_HOST"]
      original_spa_url = ENV["SCHOOL_SPA_URL"]
      ENV.delete("SCHOOL_SPA_URL")
      ENV["APP_HOST"] = "scholarpremium.com.br"
      example.run
    ensure
      ENV["APP_HOST"] = original_host
      ENV["SCHOOL_SPA_URL"] = original_spa_url
    end

    it "builds the Postmark template payload with the reset link" do
      model = template_model_for(mail)

      expect(mail.to).to eq([ "user@example.com" ])
      expect(mail.subject).to include("Redefinição de senha")
      expect(template_alias_for(mail)).to eq(Gateways::Email::Templates::PASSWORD_RESET)
      expect(template_tag_for(mail)).to eq("auth-password-reset")
      expect(model[:cta_url]).to include("token=reset-token-xyz")
      expect(model[:cta_url]).to include("https://scholarpremium.com.br/app/redefinir-senha")
      expect(model[:expiry_hours]).to eq(Gateways::Email::Templates::PASSWORD_RESET_EXPIRY_HOURS)
    end
  end
end
