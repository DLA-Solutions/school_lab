# frozen_string_literal: true

require "rails_helper"

RSpec.describe MarketingMailer do
  describe "#demo_request" do
    subject(:mail) do
      described_class.with(
        name: "Maria Silva",
        email: "maria@example.com",
        phone: "+55 11 99999-0000",
        submitted_at: Time.zone.parse("2026-08-21 10:30:00")
      ).demo_request
    end

    around do |example|
      original_recipients = ENV["MARKETING_DEMO_REQUEST_RECIPIENTS"]
      ENV["MARKETING_DEMO_REQUEST_RECIPIENTS"] = "sales@example.com,ops@example.com"
      example.run
    ensure
      ENV["MARKETING_DEMO_REQUEST_RECIPIENTS"] = original_recipients
    end

    it "renders pt-BR content with reply-to and configured recipients" do
      body = [ mail.text_part&.decoded, mail.html_part&.decoded ].compact.join("\n")

      expect(mail.to).to eq(%w[sales@example.com ops@example.com])
      expect(mail.reply_to).to eq([ "maria@example.com" ])
      expect(mail.subject).to include("Maria Silva")
      expect(body).to include("Maria Silva")
      expect(body).to include("maria@example.com")
      expect(body).to include("+55 11 99999-0000")
      expect(body).to include("Scholar Premium")
    end
  end
end
