# frozen_string_literal: true

require "rails_helper"

RSpec.describe Gateways::Email::Fake do
  subject(:adapter) { described_class.new }

  let(:message) do
    Gateways::Email::ValueObjects::TemplateMessage.new(
      template_alias: Gateways::Email::Templates::PASSWORD_RESET,
      to: "user@example.com",
      subject: "Redefinição de senha — Scholar Premium",
      tag: "auth-password-reset",
      template_model: { cta_url: "https://example.com/reset", expiry_hours: 6 }
    )
  end

  describe "#send_template" do
    it "records the payload without calling Postmark" do
      result = adapter.send_template(message)

      expect(result.message_id).to start_with("fake-")
      expect(described_class.deliveries).to eq([ message ])
    end
  end
end
