# frozen_string_literal: true

require "rails_helper"

RSpec.describe Gateways::BankSlip::Cora::Client do
  include ActiveSupport::Testing::TimeHelpers

  let(:school) { create(:school) }
  let(:pair) { OpensslCertificateHelper.generate_certificate_pair }
  let!(:provider_config) do
    create(:school_payment_provider, school: school, provider: "cora",
                                     certificate_pem: pair[:certificate_pem],
                                     private_key_pem: pair[:private_key_pem],
                                     client_id: "client-stage-001")
  end
  let(:cache) { ActiveSupport::Cache.lookup_store(:memory_store) }
  let(:client) do
    described_class.new(
      config: provider_config,
      token_cache: Gateways::BankSlip::Cora::TokenCache.new(
        school_id: school.id,
        provider: "cora",
        token_url: CORA_TEST_TOKEN_URL,
        cache: cache
      )
    )
  end

  before { stub_cora_token }

  it "obtains a token with client credentials over mutual TLS" do
    stub_cora_api(:get, "/v1/invoices", status: 200, body: '{"ok":true}')

    client.get("/v1/invoices")

    expect(WebMock).to have_requested(:post, CORA_TEST_TOKEN_URL)
      .with(body: "grant_type=client_credentials&client_id=client-stage-001")
    expect(WebMock).to have_requested(:get, "#{CORA_TEST_API_BASE_URL}/v1/invoices")
      .with(headers: { "Authorization" => "Bearer token-abc" })
  end

  it "does not write certificate material to temp files" do
    before_files = Dir.children(Dir.tmpdir)
    stub_cora_api(:get, "/v1/invoices", status: 200, body: '{"ok":true}')

    client.get("/v1/invoices")

    after_files = Dir.children(Dir.tmpdir)
    expect(after_files - before_files).to be_empty
  end

  it "caches tokens per school, provider and token URL" do
    stub_cora_api(:get, "/v1/invoices", status: 200, body: '{"ok":true}')

    client.get("/v1/invoices")
    client.get("/v1/invoices")

    expect(WebMock).to have_requested(:post, CORA_TEST_TOKEN_URL).once
  end

  it "reuses the token until the provider lifetime minus the safety margin" do
    stub_cora_token(response_body: { access_token: "token-abc", expires_in: 3_600 })
    stub_cora_api(:get, "/v1/invoices", status: 200, body: '{"ok":true}')

    client.get("/v1/invoices")

    cache_ttl = Gateways::BankSlip::Cora::Configuration.token_cache_ttl(3_600)

    travel(cache_ttl - 60) { client.get("/v1/invoices") }
    expect(WebMock).to have_requested(:post, CORA_TEST_TOKEN_URL).once

    travel(cache_ttl + 60) { client.get("/v1/invoices") }
    expect(WebMock).to have_requested(:post, CORA_TEST_TOKEN_URL).twice
  end

  it "does not cache a token whose lifetime is shorter than the safety margin" do
    stub_cora_token(response_body: { access_token: "token-abc", expires_in: 60 })
    stub_cora_api(:get, "/v1/invoices", status: 200, body: '{"ok":true}')

    client.get("/v1/invoices")
    client.get("/v1/invoices")

    expect(WebMock).to have_requested(:post, CORA_TEST_TOKEN_URL).twice
  end

  it "uses separate token requests for different schools" do
    other_school = create(:school)
    other_pair = OpensslCertificateHelper.generate_certificate_pair
    create(:school_payment_provider, school: other_school, provider: "cora",
                                     certificate_pem: other_pair[:certificate_pem],
                                     private_key_pem: other_pair[:private_key_pem],
                                     client_id: "client-other")
    other_client = described_class.for_school(school: other_school)

    stub_cora_api(:get, "/v1/invoices", status: 200, body: '{"ok":true}')

    client.get("/v1/invoices")
    other_client.get("/v1/invoices")

    expect(WebMock).to have_requested(:post, CORA_TEST_TOKEN_URL).twice
  end

  it "retries once after a 401 and raises AuthenticationError when the retry also fails" do
    stub_cora_api(:get, "/v1/invoices", status: 401, body: "unauthorized")
      .times(2)

    expect { client.get("/v1/invoices") }.to raise_error(Gateways::BankSlip::AuthenticationError)
    expect(WebMock).to have_requested(:post, CORA_TEST_TOKEN_URL).twice
  end

  it "maps provider status codes to the error taxonomy" do
    stub_cora_api(:get, "/v1/bad", status: 500, body: "error")
    stub_cora_api(:get, "/v1/validation", status: 422, body: '{"code":"invalid"}')
    stub_cora_api(:get, "/v1/forbidden", status: 403, body: "forbidden")

    expect { client.get("/v1/bad") }.to raise_error(Gateways::BankSlip::TransientError)
    expect { client.get("/v1/validation") }.to raise_error(Gateways::BankSlip::ValidationError)
    expect { client.get("/v1/forbidden") }.to raise_error(Gateways::BankSlip::AuthenticationError)
  end

  it "maps connection timeouts to TransientError" do
    stub_cora_api(:get, "/v1/timeout").to_timeout

    expect { client.get("/v1/timeout") }.to raise_error(Gateways::BankSlip::TransientError, /connection error/)
  end

  it "targets the billing URLs from ENV, not a school attribute" do
    with_cora_billing_urls(api_base_url: CORA_ALT_API_BASE_URL, token_url: CORA_ALT_TOKEN_URL) do
      stub_request(:post, CORA_ALT_TOKEN_URL)
        .to_return(status: 200, body: { access_token: "alt-token", expires_in: 86_400 }.to_json)
      stub_request(:get, "#{CORA_ALT_API_BASE_URL}/v1/invoices")
        .to_return(status: 200, body: '{"ok":true}')

      described_class.for_school(school: school).get("/v1/invoices")
    end

    expect(WebMock).to have_requested(:get, "#{CORA_ALT_API_BASE_URL}/v1/invoices")
    expect(WebMock).not_to have_requested(:get, "#{CORA_TEST_API_BASE_URL}/v1/invoices")
  end

  it "does not reuse a token minted for another token URL" do
    primary_cache = Gateways::BankSlip::Cora::TokenCache.new(
      school_id: school.id, provider: "cora", token_url: CORA_TEST_TOKEN_URL, cache: cache
    )
    alternate_cache = Gateways::BankSlip::Cora::TokenCache.new(
      school_id: school.id, provider: "cora", token_url: CORA_ALT_TOKEN_URL, cache: cache
    )
    primary_cache.write("primary-token", expires_in: 3_600)

    expect(alternate_cache.fetch { "freshly-minted" }).to eq("freshly-minted")
    expect(primary_cache.fetch { "freshly-minted" }).to eq("primary-token")
  end

  it "does not include secrets in raised errors" do
    stub_cora_api(:get, "/v1/secret", status: 403, body: "forbidden")

    expect { client.get("/v1/secret") }.to raise_error(Gateways::BankSlip::AuthenticationError) do |error|
      message = error.message
      aggregate_failures do
        expect(message).not_to include("BEGIN")
        expect(message).not_to include("client-stage-001")
        expect(message).not_to include("token-abc")
      end
    end
  end
end

RSpec.describe Gateways::BankSlip::Cora::Configuration do
  it "sets explicit timeouts on the client" do
    expect(described_class::CONNECT_TIMEOUT).to eq(5)
    expect(described_class::READ_TIMEOUT).to eq(10)
  end

  it "raises ProviderError when billing URLs are missing" do
    with_cora_billing_urls(api_base_url: nil, token_url: nil) do
      expect { described_class.current }
        .to raise_error(Gateways::BankSlip::ProviderError, /CORA_API_BASE_URL/)
    end
  end
end
