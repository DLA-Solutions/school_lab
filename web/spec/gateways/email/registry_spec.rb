# frozen_string_literal: true

require "rails_helper"

RSpec.describe Gateways::Email::Registry do
  after { described_class.reset! }

  describe ".current" do
    it "returns Fake in the test environment" do
      expect(described_class.current).to be_a(Gateways::Email::Fake)
    end

    it "returns Postmark adapter when not local and token is present" do
      allow(SchoolLab::EmailDelivery).to receive(:local_delivery_enabled?).and_return(false)
      allow(SchoolLab::EmailDelivery).to receive(:provider_configured?).and_return(true)

      described_class.reset!
      expect(described_class.current).to be_a(Gateways::Email::Postmark::Adapter)
    end
  end
end
