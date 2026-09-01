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

    it "builds the Postmark template payload with reply-to and configured recipients" do
      model = template_model_for(mail)

      expect(mail.to).to eq(%w[sales@example.com ops@example.com])
      expect(mail.reply_to).to eq([ "maria@example.com" ])
      expect(mail.subject).to include("Maria Silva")
      expect(template_alias_for(mail)).to eq(Gateways::Email::Templates::DEMO_REQUEST)
      expect(template_tag_for(mail)).to eq("marketing-demo-request")
      expect(model).to include(
        name: "Maria Silva",
        email: "maria@example.com",
        phone: "+55 11 99999-0000"
      )
      expect(model[:submitted_at]).to be_present
    end
  end

  describe "#demo_request_confirmation" do
    subject(:mail) do
      described_class.with(
        name: "Maria Silva",
        email: "maria@example.com"
      ).demo_request_confirmation
    end

    it "builds the Postmark template payload for the submitter" do
      model = template_model_for(mail)

      expect(mail.to).to eq([ "maria@example.com" ])
      expect(mail.reply_to).to eq([ SchoolLab::EmailDelivery.from_address ])
      expect(mail.subject).to include("Recebemos sua solicitação")
      expect(template_alias_for(mail)).to eq(Gateways::Email::Templates::DEMO_REQUEST_CONFIRMATION)
      expect(template_tag_for(mail)).to eq("marketing-demo-confirmation")
      expect(model).to include(name: "Maria Silva")
    end
  end
end
