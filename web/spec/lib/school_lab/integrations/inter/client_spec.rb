# frozen_string_literal: true

require "rails_helper"

RSpec.describe SchoolLab::Integrations::Inter::Client do
  include ActiveSupport::Testing::TimeHelpers

  let(:pair) { OpensslCertificateHelper.generate_certificate_pair }
  let(:cache) { ActiveSupport::Cache.lookup_store(:memory_store) }
  let(:token_cache) do
    SchoolLab::Integrations::Inter::TokenCache.new(
      school_id: 1,
      provider: "inter",
      token_url: INTER_TEST_TOKEN_URL,
      cache: cache
    )
  end
  let(:client) do
    described_class.new(
      client_id: "client-stage-001",
      client_secret: "secret-stage-001",
      certificate_pem: pair[:certificate_pem],
      private_key_pem: pair[:private_key_pem],
      token_cache: token_cache
    )
  end

  before { stub_inter_token }

  it "obtains a token with client credentials and scope over mutual TLS" do
    stub_inter_api(:get, "/cobranca/v3/cobrancas/inv-1", status: 200, body: '{"ok":true}')

    client.get("/cobranca/v3/cobrancas/inv-1")

    expect(WebMock).to have_requested(:post, INTER_TEST_TOKEN_URL)
      .with(body: "grant_type=client_credentials&client_id=client-stage-001&client_secret=secret-stage-001&" \
                  "scope=boleto-cobranca.read+boleto-cobranca.write")
    expect(WebMock).to have_requested(:get, "#{INTER_TEST_API_BASE_URL}/cobranca/v3/cobrancas/inv-1")
      .with(headers: { "Authorization" => "Bearer token-abc" })
  end

  it "does not write certificate material to temp files" do
    certificate_file_pattern = /cert|key|pem|pkcs|p12|pfx/i
    before_files = Dir.children(Dir.tmpdir).grep(certificate_file_pattern)
    stub_inter_api(:get, "/cobranca/v3/cobrancas/inv-1", status: 200, body: '{"ok":true}')

    client.get("/cobranca/v3/cobrancas/inv-1")

    after_files = Dir.children(Dir.tmpdir).grep(certificate_file_pattern)
    expect(after_files - before_files).to be_empty
  end

  it "caches tokens per school, provider and token URL" do
    stub_inter_api(:get, "/cobranca/v3/cobrancas/inv-1", status: 200, body: '{"ok":true}')

    client.get("/cobranca/v3/cobrancas/inv-1")
    client.get("/cobranca/v3/cobrancas/inv-1")

    expect(WebMock).to have_requested(:post, INTER_TEST_TOKEN_URL).once
  end

  it "reuses the token until the provider lifetime minus the safety margin" do
    stub_inter_token(response_body: { access_token: "token-abc", expires_in: 3_600 })
    stub_inter_api(:get, "/cobranca/v3/cobrancas/inv-1", status: 200, body: '{"ok":true}')

    client.get("/cobranca/v3/cobrancas/inv-1")

    cache_ttl = SchoolLab::Integrations::Inter::Configuration.token_cache_ttl(3_600)

    travel(cache_ttl - 60) { client.get("/cobranca/v3/cobrancas/inv-1") }
    expect(WebMock).to have_requested(:post, INTER_TEST_TOKEN_URL).once

    travel(cache_ttl + 60) { client.get("/cobranca/v3/cobrancas/inv-1") }
    expect(WebMock).to have_requested(:post, INTER_TEST_TOKEN_URL).twice
  end

  it "does not cache a token whose lifetime is shorter than the safety margin" do
    stub_inter_token(response_body: { access_token: "token-abc", expires_in: 60 })
    stub_inter_api(:get, "/cobranca/v3/cobrancas/inv-1", status: 200, body: '{"ok":true}')

    client.get("/cobranca/v3/cobrancas/inv-1")
    client.get("/cobranca/v3/cobrancas/inv-1")

    expect(WebMock).to have_requested(:post, INTER_TEST_TOKEN_URL).twice
  end

  it "uses separate token requests for different schools" do
    other_token_cache = SchoolLab::Integrations::Inter::TokenCache.new(
      school_id: 2,
      provider: "inter",
      token_url: INTER_TEST_TOKEN_URL,
      cache: cache
    )
    other_client = described_class.new(
      client_id: "client-other",
      client_secret: "secret-other",
      certificate_pem: pair[:certificate_pem],
      private_key_pem: pair[:private_key_pem],
      token_cache: other_token_cache
    )

    stub_inter_api(:get, "/cobranca/v3/cobrancas/inv-1", status: 200, body: '{"ok":true}')

    client.get("/cobranca/v3/cobrancas/inv-1")
    other_client.get("/cobranca/v3/cobrancas/inv-1")

    expect(WebMock).to have_requested(:post, INTER_TEST_TOKEN_URL).twice
  end

  it "retries once after a 401 and raises AuthenticationError when the retry also fails" do
    stub_inter_api(:get, "/cobranca/v3/cobrancas/inv-1", status: 401, body: "unauthorized")
      .times(2)

    expect { client.get("/cobranca/v3/cobrancas/inv-1") }
      .to raise_error(SchoolLab::Integrations::Inter::AuthenticationError)
    expect(WebMock).to have_requested(:post, INTER_TEST_TOKEN_URL).twice
  end

  it "maps provider status codes to the error taxonomy" do
    stub_inter_api(:get, "/cobranca/v3/bad", status: 500, body: "error")
    stub_inter_api(:get, "/cobranca/v3/validation", status: 422, body: '{"code":"invalid"}')
    stub_inter_api(:get, "/cobranca/v3/forbidden", status: 403, body: "forbidden")

    expect { client.get("/cobranca/v3/bad") }.to raise_error(SchoolLab::Integrations::Inter::TransientError)
    expect { client.get("/cobranca/v3/validation") }.to raise_error(SchoolLab::Integrations::Inter::ValidationError)
    expect { client.get("/cobranca/v3/forbidden") }.to raise_error(SchoolLab::Integrations::Inter::AuthenticationError)
  end

  it "maps connection timeouts to TransientError" do
    stub_inter_api(:get, "/cobranca/v3/timeout").to_timeout

    expect { client.get("/cobranca/v3/timeout") }
      .to raise_error(SchoolLab::Integrations::Inter::TransientError, /connection error/)
  end

  it "targets the billing URLs from ENV, not a school attribute" do
    with_inter_billing_urls(api_base_url: INTER_ALT_API_BASE_URL, token_url: INTER_ALT_TOKEN_URL) do
      stub_request(:post, INTER_ALT_TOKEN_URL)
        .to_return(status: 200, body: { access_token: "alt-token", expires_in: 3_600 }.to_json)
      stub_request(:get, "#{INTER_ALT_API_BASE_URL}/cobranca/v3/cobrancas/inv-1")
        .to_return(status: 200, body: '{"ok":true}')

      described_class.new(
        client_id: "client-stage-001",
        client_secret: "secret-stage-001",
        certificate_pem: pair[:certificate_pem],
        private_key_pem: pair[:private_key_pem],
        token_cache: SchoolLab::Integrations::Inter::TokenCache.new(
          school_id: 1, provider: "inter", token_url: INTER_ALT_TOKEN_URL, cache: cache
        ),
        billing_urls: SchoolLab::Integrations::Inter::Configuration.current
      ).get("/cobranca/v3/cobrancas/inv-1")
    end

    expect(WebMock).to have_requested(:get, "#{INTER_ALT_API_BASE_URL}/cobranca/v3/cobrancas/inv-1")
    expect(WebMock).not_to have_requested(:get, "#{INTER_TEST_API_BASE_URL}/cobranca/v3/cobrancas/inv-1")
  end

  it "does not reuse a token minted for another token URL" do
    primary_cache = SchoolLab::Integrations::Inter::TokenCache.new(
      school_id: 1, provider: "inter", token_url: INTER_TEST_TOKEN_URL, cache: cache
    )
    alternate_cache = SchoolLab::Integrations::Inter::TokenCache.new(
      school_id: 1, provider: "inter", token_url: INTER_ALT_TOKEN_URL, cache: cache
    )
    primary_cache.write("primary-token", expires_in: 3_600)

    expect(alternate_cache.fetch { "freshly-minted" }).to eq("freshly-minted")
    expect(primary_cache.fetch { "freshly-minted" }).to eq("primary-token")
  end

  it "does not include secrets in raised errors" do
    stub_inter_api(:get, "/cobranca/v3/secret", status: 403, body: "forbidden")

    expect { client.get("/cobranca/v3/secret") }
      .to raise_error(SchoolLab::Integrations::Inter::AuthenticationError) do |error|
        message = error.message
        aggregate_failures do
          expect(message).not_to include("BEGIN")
          expect(message).not_to include("client-stage-001")
          expect(message).not_to include("secret-stage-001")
          expect(message).not_to include("token-abc")
        end
      end
  end
end

RSpec.describe SchoolLab::Integrations::Inter::Configuration do
  it "sets explicit timeouts on the client" do
    expect(described_class::CONNECT_TIMEOUT).to eq(5)
    expect(described_class::READ_TIMEOUT).to eq(10)
  end

  it "raises ConfigurationError when billing URLs are missing" do
    with_inter_billing_urls(api_base_url: nil, token_url: nil) do
      expect { described_class.current }
        .to raise_error(SchoolLab::Integrations::Inter::ConfigurationError, /INTER_API_BASE_URL/)
    end
  end
end
