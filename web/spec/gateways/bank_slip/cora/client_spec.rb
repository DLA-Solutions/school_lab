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
        environment: "stage",
        cache: cache
      )
    )
  end

  before do
    stub_request(:post, "https://matls-clients.api.stage.cora.com.br/token")
      .to_return(
        status: 200,
        body: { access_token: "token-abc", expires_in: 86_400 }.to_json,
        headers: { "Content-Type" => "application/json" }
      )
  end

  it "obtains a token with client credentials over mutual TLS" do
    stub_request(:get, "https://api.stage.cora.com.br/v1/invoices")
      .to_return(status: 200, body: '{"ok":true}')

    client.get("/v1/invoices")

    expect(WebMock).to have_requested(:post, "https://matls-clients.api.stage.cora.com.br/token")
      .with(body: "grant_type=client_credentials&client_id=client-stage-001")
    expect(WebMock).to have_requested(:get, "https://api.stage.cora.com.br/v1/invoices")
      .with(headers: { "Authorization" => "Bearer token-abc" })
  end

  it "does not write certificate material to temp files" do
    before_files = Dir.children(Dir.tmpdir)
    stub_request(:get, "https://api.stage.cora.com.br/v1/invoices")
      .to_return(status: 200, body: '{"ok":true}')

    client.get("/v1/invoices")

    after_files = Dir.children(Dir.tmpdir)
    expect(after_files - before_files).to be_empty
  end

  it "caches tokens per school, provider and environment" do
    stub_request(:get, "https://api.stage.cora.com.br/v1/invoices")
      .to_return(status: 200, body: '{"ok":true}')

    client.get("/v1/invoices")
    client.get("/v1/invoices")

    expect(WebMock).to have_requested(:post, "https://matls-clients.api.stage.cora.com.br/token").once
  end

  it "reuses the token until the provider lifetime minus the safety margin" do
    stub_request(:post, "https://matls-clients.api.stage.cora.com.br/token")
      .to_return(
        status: 200,
        body: { access_token: "token-abc", expires_in: 3_600 }.to_json,
        headers: { "Content-Type" => "application/json" }
      )
    stub_request(:get, "https://api.stage.cora.com.br/v1/invoices")
      .to_return(status: 200, body: '{"ok":true}')

    client.get("/v1/invoices")

    cache_ttl = Gateways::BankSlip::Cora::Configuration.token_cache_ttl(3_600)

    travel(cache_ttl - 60) { client.get("/v1/invoices") }
    expect(WebMock).to have_requested(:post, "https://matls-clients.api.stage.cora.com.br/token").once

    travel(cache_ttl + 60) { client.get("/v1/invoices") }
    expect(WebMock).to have_requested(:post, "https://matls-clients.api.stage.cora.com.br/token").twice
  end

  it "does not cache a token whose lifetime is shorter than the safety margin" do
    stub_request(:post, "https://matls-clients.api.stage.cora.com.br/token")
      .to_return(
        status: 200,
        body: { access_token: "token-abc", expires_in: 60 }.to_json,
        headers: { "Content-Type" => "application/json" }
      )
    stub_request(:get, "https://api.stage.cora.com.br/v1/invoices")
      .to_return(status: 200, body: '{"ok":true}')

    client.get("/v1/invoices")
    client.get("/v1/invoices")

    expect(WebMock).to have_requested(:post, "https://matls-clients.api.stage.cora.com.br/token").twice
  end

  it "uses separate token requests for different schools" do
    other_school = create(:school)
    other_pair = OpensslCertificateHelper.generate_certificate_pair
    create(:school_payment_provider, school: other_school, provider: "cora",
                                     certificate_pem: other_pair[:certificate_pem],
                                     private_key_pem: other_pair[:private_key_pem],
                                     client_id: "client-other")
    other_client = described_class.for_school(school: other_school)

    stub_request(:get, "https://api.stage.cora.com.br/v1/invoices")
      .to_return(status: 200, body: '{"ok":true}')

    client.get("/v1/invoices")
    other_client.get("/v1/invoices")

    expect(WebMock).to have_requested(:post, "https://matls-clients.api.stage.cora.com.br/token").twice
  end

  it "retries once after a 401 and raises AuthenticationError when the retry also fails" do
    stub_request(:get, "https://api.stage.cora.com.br/v1/invoices")
      .to_return(status: 401, body: "unauthorized")
      .times(2)

    expect { client.get("/v1/invoices") }.to raise_error(Gateways::BankSlip::AuthenticationError)
    expect(WebMock).to have_requested(:post, "https://matls-clients.api.stage.cora.com.br/token").twice
  end

  it "maps provider status codes to the error taxonomy" do
    stub_request(:get, "https://api.stage.cora.com.br/v1/bad")
      .to_return(status: 500, body: "error")
    stub_request(:get, "https://api.stage.cora.com.br/v1/validation")
      .to_return(status: 422, body: '{"code":"invalid"}')
    stub_request(:get, "https://api.stage.cora.com.br/v1/forbidden")
      .to_return(status: 403, body: "forbidden")

    expect { client.get("/v1/bad") }.to raise_error(Gateways::BankSlip::TransientError)
    expect { client.get("/v1/validation") }.to raise_error(Gateways::BankSlip::ValidationError)
    expect { client.get("/v1/forbidden") }.to raise_error(Gateways::BankSlip::AuthenticationError)
  end

  it "maps connection timeouts to TransientError" do
    stub_request(:get, "https://api.stage.cora.com.br/v1/timeout")
      .to_timeout

    expect { client.get("/v1/timeout") }.to raise_error(Gateways::BankSlip::TransientError, /connection error/)
  end

  it "targets the hosts of the deploy environment, not a school attribute" do
    stub_request(:post, "https://matls-clients.api.cora.com.br/token")
      .to_return(status: 200, body: { access_token: "prod-token", expires_in: 86_400 }.to_json)
    stub_request(:get, "https://api.cora.com.br/v1/invoices")
      .to_return(status: 200, body: '{"ok":true}')

    with_cora_environment("production") do
      described_class.for_school(school: school).get("/v1/invoices")
    end

    expect(WebMock).to have_requested(:get, "https://api.cora.com.br/v1/invoices")
    expect(WebMock).not_to have_requested(:get, "https://api.stage.cora.com.br/v1/invoices")
  end

  it "does not reuse a token minted for another deploy environment" do
    stage_cache = Gateways::BankSlip::Cora::TokenCache.new(
      school_id: school.id, provider: "cora", environment: "stage", cache: cache
    )
    production_cache = Gateways::BankSlip::Cora::TokenCache.new(
      school_id: school.id, provider: "cora", environment: "production", cache: cache
    )
    stage_cache.write("stage-token", expires_in: 3_600)

    expect(production_cache.fetch { "freshly-minted" }).to eq("freshly-minted")
    expect(stage_cache.fetch { "freshly-minted" }).to eq("stage-token")
  end

  it "does not include secrets in raised errors" do
    stub_request(:get, "https://api.stage.cora.com.br/v1/secret")
      .to_return(status: 403, body: "forbidden")

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
end
