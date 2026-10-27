# frozen_string_literal: true

require "rails_helper"

RSpec.describe SchoolLab::Integrations::Spedy::Configuration do
  def with_base_url_env(value)
    previous = ENV.fetch("SPEDY_API_BASE_URL", nil)
    value.nil? ? ENV.delete("SPEDY_API_BASE_URL") : ENV["SPEDY_API_BASE_URL"] = value
    yield
  ensure
    previous.nil? ? ENV.delete("SPEDY_API_BASE_URL") : ENV["SPEDY_API_BASE_URL"] = previous
  end

  describe ".current" do
    it "defaults to the production API including /v1 and does not raise when the env var is unset" do
      with_base_url_env(nil) do
        expect(described_class.current).to eq(api_base_url: "https://api.spedy.com.br/v1")
      end
    end

    it "treats a blank env var as unset" do
      with_base_url_env("  ") do
        expect(described_class.current).to eq(api_base_url: described_class::DEFAULT_API_BASE_URL)
      end
    end

    it "lets SPEDY_API_BASE_URL override the default, without a trailing slash" do
      with_base_url_env("https://sandbox.spedy.test/v1/") do
        expect(described_class.current).to eq(api_base_url: "https://sandbox.spedy.test/v1")
      end
    end
  end

  describe ".valid_base_url?" do
    it "accepts https URLs with a real host" do
      expect(described_class.valid_base_url?("https://api.spedy.com.br/v1")).to be(true)
    end

    it "rejects http, other schemes, relative strings and blanks" do
      [ "http://api.spedy.com.br/v1", "ftp://x.test", "api.spedy.com.br", "", nil, "https://" ].each do |value|
        expect(described_class.valid_base_url?(value)).to be(false), "expected #{value.inspect} to be invalid"
      end
    end

    it "rejects credentials, queries, localhost and IP literals" do
      [ "https://user:pw@api.spedy.com.br/v1", "https://x.test/v1?a=1", "https://localhost/v1",
        "https://127.0.0.1/v1", "https://[::1]/v1" ].each do |value|
        expect(described_class.valid_base_url?(value)).to be(false), "expected #{value.inspect} to be invalid"
      end
    end
  end
end
