# frozen_string_literal: true

require "rails_helper"

RSpec.describe SchoolLab::Integrations::Fcm::Configuration do
  around do |example|
    keys = %w[FCM_PROJECT_ID FCM_CLIENT_EMAIL FCM_PRIVATE_KEY]
    original = keys.index_with { |key| ENV[key] }
    example.run
  ensure
    original.each { |key, value| value.nil? ? ENV.delete(key) : ENV[key] = value }
  end

  it "sets explicit connect/read timeouts" do
    expect(described_class::CONNECT_TIMEOUT).to eq(5)
    expect(described_class::READ_TIMEOUT).to eq(10)
  end

  describe "#project_id" do
    it "reads FCM_PROJECT_ID" do
      ENV["FCM_PROJECT_ID"] = "school-lab-test"

      expect(described_class.project_id).to eq("school-lab-test")
    end

    it "raises ConfigurationError when missing" do
      ENV.delete("FCM_PROJECT_ID")

      expect { described_class.project_id }
        .to raise_error(SchoolLab::Integrations::Fcm::ConfigurationError, /FCM_PROJECT_ID/)
    end
  end

  describe "#client_email" do
    it "raises ConfigurationError when missing" do
      ENV.delete("FCM_CLIENT_EMAIL")

      expect { described_class.client_email }
        .to raise_error(SchoolLab::Integrations::Fcm::ConfigurationError, /FCM_CLIENT_EMAIL/)
    end
  end

  describe "#private_key" do
    it "unescapes literal \\n sequences into real newlines" do
      ENV["FCM_PRIVATE_KEY"] = "-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----\\n"

      expect(described_class.private_key).to eq("-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----\n")
    end

    it "raises ConfigurationError when missing" do
      ENV.delete("FCM_PRIVATE_KEY")

      expect { described_class.private_key }
        .to raise_error(SchoolLab::Integrations::Fcm::ConfigurationError, /FCM_PRIVATE_KEY/)
    end
  end

  describe "#configured?" do
    it "is true only when all three vars are present" do
      ENV["FCM_PROJECT_ID"] = "p"
      ENV["FCM_CLIENT_EMAIL"] = "e"
      ENV["FCM_PRIVATE_KEY"] = "k"

      expect(described_class.configured?).to be(true)
    end

    it "is false when any var is missing" do
      ENV["FCM_PROJECT_ID"] = "p"
      ENV["FCM_CLIENT_EMAIL"] = "e"
      ENV.delete("FCM_PRIVATE_KEY")

      expect(described_class.configured?).to be(false)
    end
  end

  describe "#token_cache_ttl" do
    it "subtracts the safety margin from the provider lifetime" do
      expect(described_class.token_cache_ttl(3_600)).to eq(3_300)
    end

    it "floors at zero for a lifetime shorter than the safety margin" do
      expect(described_class.token_cache_ttl(60)).to eq(0)
    end
  end
end
