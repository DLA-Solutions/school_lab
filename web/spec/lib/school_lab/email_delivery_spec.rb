# frozen_string_literal: true

require "rails_helper"

RSpec.describe SchoolLab::EmailDelivery do
  describe ".configured?" do
    it "is true when POSTMARK_API_TOKEN is set" do
      original = ENV["POSTMARK_API_TOKEN"]
      ENV["POSTMARK_API_TOKEN"] = "test-token"

      expect(described_class.configured?).to be(true)

      ENV["POSTMARK_API_TOKEN"] = original
    end

    it "is false when POSTMARK_API_TOKEN is blank" do
      original = ENV["POSTMARK_API_TOKEN"]
      ENV.delete("POSTMARK_API_TOKEN")

      expect(described_class.configured?).to be(false)

      ENV["POSTMARK_API_TOKEN"] = original
    end
  end
end
