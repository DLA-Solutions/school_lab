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

    it "renders pt-BR content with the invite link" do
      expect(mail.to).to eq([ "director@example.com" ])
      expect(mail.subject).to include("Escola Exemplo")
      expect(mail.body.encoded).to include("Escola Exemplo")
      expect(mail.body.encoded).to include("token=invite-token-abc")
      expect(mail.body.encoded).to include("email=director%40example.com")
      expect(mail.body.encoded).to include("https://scholarpremium.com.br/app/invite/accept")
    end
  end
end
