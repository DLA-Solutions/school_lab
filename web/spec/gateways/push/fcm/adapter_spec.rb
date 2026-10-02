# frozen_string_literal: true

require "rails_helper"

RSpec.describe Gateways::Push::Fcm::Adapter do
  subject(:adapter) { described_class.new(client: client) }

  let(:client) { instance_double(SchoolLab::Integrations::Fcm::Client) }

  describe "#deliver" do
    it "sends through the FCM client and returns the message id" do
      allow(client).to receive(:send_message).and_return({ "name" => "projects/x/messages/0:1" })

      result = adapter.deliver(token: "device-token", title: "T", body: "B", data: { a: "1" })

      expect(result.message_id).to eq("projects/x/messages/0:1")
      expect(client).to have_received(:send_message)
        .with(token: "device-token", title: "T", body: "B", data: { a: "1" })
    end

    # This is the port-side half of BR-N09: the job rescues Gateways::Push::InvalidTokenError to
    # discard the DeviceToken; this proves the lib's UnregisteredTokenError actually reaches it.
    it "maps an unregistered token to Gateways::Push::InvalidTokenError" do
      allow(client).to receive(:send_message).and_raise(SchoolLab::Integrations::Fcm::UnregisteredTokenError, "gone")

      expect { adapter.deliver(token: "dead", title: "T", body: "B") }
        .to raise_error(Gateways::Push::InvalidTokenError)
    end

    it "maps a transient provider error" do
      allow(client).to receive(:send_message).and_raise(SchoolLab::Integrations::Fcm::TransientError, "boom")

      expect { adapter.deliver(token: "t", title: "T", body: "B") }
        .to raise_error(Gateways::Push::TransientError)
    end

    it "maps an authentication error" do
      allow(client).to receive(:send_message).and_raise(SchoolLab::Integrations::Fcm::AuthenticationError, "unauth")

      expect { adapter.deliver(token: "t", title: "T", body: "B") }
        .to raise_error(Gateways::Push::AuthenticationError)
    end

    it "maps a validation error" do
      allow(client).to receive(:send_message).and_raise(SchoolLab::Integrations::Fcm::ValidationError, "bad")

      expect { adapter.deliver(token: "t", title: "T", body: "B") }
        .to raise_error(Gateways::Push::ValidationError)
    end

    it "maps an unexpected response to a provider error" do
      allow(client).to receive(:send_message).and_raise(SchoolLab::Integrations::Fcm::UnexpectedResponseError, "?")

      expect { adapter.deliver(token: "t", title: "T", body: "B") }
        .to raise_error(Gateways::Push::ProviderError)
    end

    it "maps a connection error to a transient error" do
      allow(client).to receive(:send_message).and_raise(SchoolLab::Http::ConnectionError)

      expect { adapter.deliver(token: "t", title: "T", body: "B") }
        .to raise_error(Gateways::Push::TransientError)
    end
  end
end
