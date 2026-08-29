# frozen_string_literal: true

require "rails_helper"

RSpec.describe PeopleMailer do
  let(:school) { create(:school, name: "Escola Exemplo") }
  let(:user) { create(:user, email: "director@example.com") }
  let(:membership) { create(:membership, :invited, :staff, user: user, school: school) }
  let(:raw_token) { "invite-token-abc" }

  describe "#membership_invite" do
    subject(:mail) do
      described_class.with(membership: membership, raw_token: raw_token).membership_invite
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

    it "builds the Postmark template payload with the invite link" do
      model = template_model_for(mail)

      expect(mail.to).to eq([ "director@example.com" ])
      expect(mail.subject).to include("Escola Exemplo")
      expect(template_alias_for(mail)).to eq(Gateways::Email::Templates::MEMBERSHIP_INVITE)
      expect(template_tag_for(mail)).to eq("people-membership-invite")
      expect(model[:school_name]).to eq("Escola Exemplo")
      expect(model[:cta_url]).to include("token=invite-token-abc")
      expect(model[:cta_url]).to include("email=director%40example.com")
      expect(model[:cta_url]).to include("https://scholarpremium.com.br/app/invite/accept")
      expect(model[:expiry_days]).to eq(Gateways::Email::Templates::MEMBERSHIP_INVITE_EXPIRY_DAYS)
    end
  end
end
