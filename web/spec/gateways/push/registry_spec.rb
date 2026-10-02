# frozen_string_literal: true

require "rails_helper"

RSpec.describe Gateways::Push::Registry do
  after { described_class.reset! }

  describe ".current" do
    it "returns Fake when FCM is not configured" do
      allow(SchoolLab::Integrations::Fcm::Configuration).to receive(:configured?).and_return(false)

      described_class.reset!

      expect(described_class.current).to be_a(Gateways::Push::Fake)
    end

    it "returns the FCM adapter when configured" do
      config = SchoolLab::Integrations::Fcm::Configuration
      allow(config).to receive(:configured?).and_return(true)
      allow(config).to receive(:client_email).and_return("svc@school-lab-test.iam.gserviceaccount.com")
      allow(config).to receive(:private_key).and_return("dummy-key")
      allow(config).to receive(:project_id).and_return("school-lab-test")

      described_class.reset!

      expect(described_class.current).to be_a(Gateways::Push::Fcm::Adapter)
    end
  end
end
