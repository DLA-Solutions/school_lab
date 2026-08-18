# frozen_string_literal: true

require "rails_helper"

RSpec.describe SchoolLab::Integrations::Google::IdTokenVerifier do
  let(:client_id) { "test-google-client-id.apps.googleusercontent.com" }
  let(:cache) { ActiveSupport::Cache::MemoryStore.new }
  let(:rsa_key) { OpenSSL::PKey::RSA.generate(2048) }
  let(:jwk) { JWT::JWK.new(rsa_key, kid: "test-key-id") }
  let(:jwks_body) { { keys: [ jwk.export ] }.to_json }
  let(:http_connection) do
    instance_double(Faraday::Connection).tap do |connection|
      allow(connection).to receive(:get).with("/oauth2/v3/certs").and_return(
        instance_double(Faraday::Response, success?: true, body: jwks_body)
      )
    end
  end
  let(:verifier) do
    described_class.new(client_ids: [ client_id ], cache: cache, http_connection: http_connection)
  end

  def build_id_token(overrides = {})
    payload = {
      iss: "https://accounts.google.com",
      aud: client_id,
      sub: "google-sub-123",
      email: "staff@example.com",
      email_verified: true,
      exp: 1.hour.from_now.to_i,
      iat: Time.current.to_i
    }.merge(overrides)
    JWT.encode(payload, rsa_key, "RS256", kid: "test-key-id")
  end

  before do
    stub_const("SchoolLab::Integrations::Google::Configuration::JWKS_CACHE_TTL", 5.minutes)
  end

  describe "#verify" do
    it "returns normalized token claims for a valid token" do
      claims = verifier.verify(build_id_token)

      expect(claims.sub).to eq("google-sub-123")
      expect(claims.email).to eq("staff@example.com")
      expect(claims.email_verified).to be(true)
    end

    it "raises InvalidTokenError when email is not verified" do
      expect do
        verifier.verify(build_id_token(email_verified: false))
      end.to raise_error(SchoolLab::Integrations::Google::InvalidTokenError)
    end

    it "raises InvalidTokenError for the wrong audience" do
      expect do
        verifier.verify(build_id_token(aud: "other-client-id"))
      end.to raise_error(SchoolLab::Integrations::Google::InvalidTokenError)
    end

    it "raises InvalidTokenError when JWKS cannot be fetched" do
      allow(http_connection).to receive(:get).and_raise(Faraday::ConnectionFailed.new("offline"))

      expect do
        verifier.verify(build_id_token)
      end.to raise_error(SchoolLab::Integrations::Google::InvalidTokenError)
    end

    it "caches JWKS between verifications" do
      verifier.verify(build_id_token)
      verifier.verify(build_id_token(email: "other@example.com", sub: "google-sub-456"))

      expect(http_connection).to have_received(:get).once
    end
  end

  describe SchoolLab::Integrations::Google::Configuration do
    around do |example|
      original_client_id = ENV["GOOGLE_OAUTH_CLIENT_ID"]
      original_client_ids = ENV["GOOGLE_OAUTH_CLIENT_IDS"]
      ENV.delete("GOOGLE_OAUTH_CLIENT_ID")
      ENV.delete("GOOGLE_OAUTH_CLIENT_IDS")
      example.run
    ensure
      ENV["GOOGLE_OAUTH_CLIENT_ID"] = original_client_id
      ENV["GOOGLE_OAUTH_CLIENT_IDS"] = original_client_ids
    end

    it "raises ConfigurationError when client id env is missing" do
      expect do
        described_class.client_ids
      end.to raise_error(SchoolLab::Integrations::Google::ConfigurationError, /GOOGLE_OAUTH_CLIENT_ID/)
    end

    it "parses comma-separated GOOGLE_OAUTH_CLIENT_IDS" do
      ENV["GOOGLE_OAUTH_CLIENT_IDS"] = "client-a, client-b"

      expect(described_class.client_ids).to eq(%w[client-a client-b])
    end
  end
end
