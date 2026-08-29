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

    it "is false when delivery is disabled even if the Postmark token is set" do
      original_token = ENV["POSTMARK_API_TOKEN"]
      original_disable = ENV["DISABLE_EMAIL_DELIVERY"]
      ENV["POSTMARK_API_TOKEN"] = "test-token"
      ENV["DISABLE_EMAIL_DELIVERY"] = "true"
      allow(described_class).to receive(:local_delivery_enabled?).and_return(false)

      expect(described_class.configured?).to be(false)
    ensure
      ENV["POSTMARK_API_TOKEN"] = original_token
      ENV["DISABLE_EMAIL_DELIVERY"] = original_disable
    end

    it "stays true in test when DISABLE_EMAIL_DELIVERY is set" do
      original = ENV["DISABLE_EMAIL_DELIVERY"]
      ENV["DISABLE_EMAIL_DELIVERY"] = "true"

      expect(described_class.configured?).to be(true)
    ensure
      ENV["DISABLE_EMAIL_DELIVERY"] = original
    end
  end

  describe ".rspec_cli?" do
    it "is true in this RSpec process" do
      expect(described_class.rspec_cli?).to be(true)
    end
  end

  it "uses the :email_gateway delivery method in the test environment" do
    expect(ActionMailer::Base.delivery_method).to eq(:email_gateway)
  end
end
