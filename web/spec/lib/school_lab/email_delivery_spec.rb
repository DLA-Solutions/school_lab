# frozen_string_literal: true

require "rails_helper"

RSpec.describe SchoolLab::EmailDelivery do
  describe ".configured?" do
    it "is true in the test environment without a Postmark token" do
      original = ENV["POSTMARK_API_TOKEN"]
      ENV.delete("POSTMARK_API_TOKEN")

      expect(described_class.configured?).to be(true)
    ensure
      ENV["POSTMARK_API_TOKEN"] = original
    end

    it "is true when POSTMARK_API_TOKEN is set" do
      original = ENV["POSTMARK_API_TOKEN"]
      ENV["POSTMARK_API_TOKEN"] = "test-token"

      expect(described_class.configured?).to be(true)
    ensure
      ENV["POSTMARK_API_TOKEN"] = original
    end

    it "is false only when local delivery is disabled and the token is blank" do
      original = ENV["POSTMARK_API_TOKEN"]
      ENV.delete("POSTMARK_API_TOKEN")
      allow(described_class).to receive(:local_delivery_enabled?).and_return(false)

      expect(described_class.configured?).to be(false)
    ensure
      ENV["POSTMARK_API_TOKEN"] = original
    end
  end

  it "uses the :test delivery method in the test environment" do
    expect(ActionMailer::Base.delivery_method).to eq(:test)
  end
end
