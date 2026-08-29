# frozen_string_literal: true

require "rails_helper"

RSpec.describe SchoolLab::Features do
  describe ".auto_provision_guardian_access?" do
    it "is true in the local test environment" do
      expect(described_class.auto_provision_guardian_access?).to be(true)
    end

    it "is true when AUTO_PROVISION_GUARDIAN_ACCESS is set outside local" do
      original = ENV["AUTO_PROVISION_GUARDIAN_ACCESS"]
      ENV["AUTO_PROVISION_GUARDIAN_ACCESS"] = "true"
      allow(Rails.env).to receive(:local?).and_return(false)

      expect(described_class.auto_provision_guardian_access?).to be(true)
    ensure
      ENV["AUTO_PROVISION_GUARDIAN_ACCESS"] = original
    end

    it "is false when the env var is absent outside local" do
      original = ENV["AUTO_PROVISION_GUARDIAN_ACCESS"]
      ENV.delete("AUTO_PROVISION_GUARDIAN_ACCESS")
      allow(Rails.env).to receive(:local?).and_return(false)

      expect(described_class.auto_provision_guardian_access?).to be(false)
    ensure
      ENV["AUTO_PROVISION_GUARDIAN_ACCESS"] = original
    end

    it "is false when AUTO_PROVISION_GUARDIAN_ACCESS is false outside local" do
      original = ENV["AUTO_PROVISION_GUARDIAN_ACCESS"]
      ENV["AUTO_PROVISION_GUARDIAN_ACCESS"] = "false"
      allow(Rails.env).to receive(:local?).and_return(false)

      expect(described_class.auto_provision_guardian_access?).to be(false)
    ensure
      ENV["AUTO_PROVISION_GUARDIAN_ACCESS"] = original
    end
  end
end
