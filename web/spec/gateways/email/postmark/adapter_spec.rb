# frozen_string_literal: true

require "rails_helper"

RSpec.describe Gateways::Email::Postmark::Adapter do
  subject(:adapter) { described_class.new(client: client) }

  let(:client) { instance_double(Postmark::ApiClient) }
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
    it "delivers with template alias and model via the Postmark client" do
      allow(client).to receive(:deliver_with_template).and_return({ message_id: "pm-123" })

      result = adapter.send_template(message)

      expect(result.message_id).to eq("pm-123")
      expect(client).to have_received(:deliver_with_template).with(
        hash_including(
          template_alias: Gateways::Email::Templates::PASSWORD_RESET,
          template_model: {
            "cta_url" => "https://example.com/reset",
            "expiry_hours" => 6
          },
          tag: "auth-password-reset",
          to: "user@example.com"
        )
      )
    end

    it "maps Postmark input errors to validation errors" do
      allow(client).to receive(:deliver_with_template)
        .and_raise(Postmark::ApiInputError.new("Invalid template"))

      expect { adapter.send_template(message) }
        .to raise_error(Gateways::Email::ValidationError)
    end
  end
end
