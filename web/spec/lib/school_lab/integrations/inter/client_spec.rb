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

  describe "provider diagnostics on non-2xx responses" do
    def raised_error
      yield
    rescue SchoolLab::Integrations::Inter::Error => e
      e
    end

    it "carries the status and parsed JSON body on a 403, keeping the message free of the body" do
      stub_inter_api(:get, "/cobranca/v3/forbidden", status: 403,
                                                     body: { title: "Forbidden", detail: "scope missing" }.to_json)

      error = raised_error { client.get("/cobranca/v3/forbidden") }

      expect(error).to be_a(SchoolLab::Integrations::Inter::AuthenticationError)
      expect(error.http_status).to eq(403)
      expect(error.provider_response).to eq("title" => "Forbidden", "detail" => "scope missing")
      expect(error.message).to eq("Provider authentication failed (403)")
    end

    it "carries the status and raw body on a 401 that persists after the token retry" do
      stub_inter_api(:get, "/cobranca/v3/unauthorized", status: 401, body: "invalid token").times(2)

      error = raised_error { client.get("/cobranca/v3/unauthorized") }

      expect(error).to be_a(SchoolLab::Integrations::Inter::AuthenticationError)
      expect(error.http_status).to eq(401)
      expect(error.provider_response).to eq("invalid token")
    end

    it "carries the status and body on a 5xx" do
      stub_inter_api(:get, "/cobranca/v3/bad", status: 503, body: { message: "unavailable" }.to_json)

      error = raised_error { client.get("/cobranca/v3/bad") }

      expect(error).to be_a(SchoolLab::Integrations::Inter::TransientError)
      expect(error.http_status).to eq(503)
      expect(error.provider_response).to eq("message" => "unavailable")
    end

    it "carries the status and body on any other status" do
      stub_inter_api(:get, "/cobranca/v3/missing", status: 404, body: { title: "Not found" }.to_json)

      error = raised_error { client.get("/cobranca/v3/missing") }

      expect(error).to be_a(SchoolLab::Integrations::Inter::UnexpectedResponseError)
      expect(error.http_status).to eq(404)
      expect(error.provider_response).to eq("title" => "Not found")
    end

    it "keeps details and adds status and body on validation errors" do
      stub_inter_api(:post, "/cobranca/v3/cobrancas", status: 422, body: { violacoes: [ { campo: "x" } ] }.to_json)

      error = raised_error { client.post("/cobranca/v3/cobrancas", body: "{}") }

      expect(error).to be_a(SchoolLab::Integrations::Inter::ValidationError)
      expect(error.details).to eq("violacoes" => [ { "campo" => "x" } ])
      expect(error.http_status).to eq(422)
      expect(error.provider_response).to eq("violacoes" => [ { "campo" => "x" } ])
    end

    it "carries the status and body when the token endpoint rejects the credentials" do
      stub_request(:post, INTER_TEST_TOKEN_URL)
        .to_return(status: 401, body: { error: "invalid_client", error_description: "bad credentials" }.to_json)

      error = raised_error { client.get("/cobranca/v3/cobrancas/inv-1") }

      expect(error).to be_a(SchoolLab::Integrations::Inter::AuthenticationError)
      expect(error.http_status).to eq(401)
      expect(error.provider_response).to eq("error" => "invalid_client", "error_description" => "bad credentials")
    end

    it "has no provider response for an empty body" do
      stub_inter_api(:get, "/cobranca/v3/bad", status: 502, body: "")

      error = raised_error { client.get("/cobranca/v3/bad") }

      expect(error.http_status).to eq(502)
      expect(error.provider_response).to be_nil
    end

    it "truncates an oversized non-JSON body" do
      stub_inter_api(:get, "/cobranca/v3/bad", status: 500, body: "x" * 50_000)

      error = raised_error { client.get("/cobranca/v3/bad") }

      expect(error.provider_response).to be_a(String)
      expect(error.provider_response.bytesize).to eq(described_class::MAX_ERROR_BODY_BYTES)
    end

    it "leaves the status and body empty for connection errors" do
      stub_inter_api(:get, "/cobranca/v3/timeout").to_timeout

      error = raised_error { client.get("/cobranca/v3/timeout") }

      expect(error).to be_a(SchoolLab::Integrations::Inter::TransientError)
      expect(error.http_status).to be_nil
      expect(error.provider_response).to be_nil
    end
  end

  it "maps connection timeouts to TransientError" do
    stub_inter_api(:get, "/cobranca/v3/timeout").to_timeout

    expect { client.get("/cobranca/v3/timeout") }
      .to raise_error(SchoolLab::Integrations::Inter::TransientError, /connection error/)
  end

  describe "connection failures" do
    it "keeps the public message and exposes a timeout as the root cause" do
      stub_inter_api(:get, "/cobranca/v3/timeout").to_timeout

      expect { client.get("/cobranca/v3/timeout") }
        .to raise_error(SchoolLab::Integrations::Inter::TransientError, "Provider connection error") { |error|
          expect(error.cause_class).to be_present
          expect(error.cause_message).to be_present
        }
    end

    it "exposes a TLS/mTLS rejection on the API call" do
      stub_inter_api(:get, "/cobranca/v3/tls")
        .to_raise(OpenSSL::SSL::SSLError.new("SSL_connect returned=1 (tlsv13 alert certificate expired)"))

      expect { client.get("/cobranca/v3/tls") }
        .to raise_error(SchoolLab::Integrations::Inter::TransientError, "Provider connection error") { |error|
          expect(error.cause_class).to eq("OpenSSL::SSL::SSLError")
          expect(error.cause_message).to include("certificate expired")
          expect(error.http_status).to be_nil
        }
    end

    it "exposes the root cause when the token request fails" do
      stub_request(:post, INTER_TEST_TOKEN_URL).to_raise(Faraday::SSLError.new("certificate verify failed"))

      expect { client.get("/cobranca/v3/cobrancas/inv-1") }
        .to raise_error(SchoolLab::Integrations::Inter::TransientError, "Provider connection error") { |error|
          expect(error.cause_class).to eq("Faraday::SSLError")
          expect(error.cause_message).to eq("certificate verify failed")
        }
    end

    it "exposes a refused connection" do
      stub_inter_api(:get, "/cobranca/v3/refused").to_raise(Errno::ECONNREFUSED)

      expect { client.get("/cobranca/v3/refused") }
        .to raise_error(SchoolLab::Integrations::Inter::TransientError) { |error|
          expect(error.cause_class).to eq("Errno::ECONNREFUSED")
        }
    end
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

  describe "#boleto_pdf" do
    let(:pdf_bytes) { "%PDF-1.4\n%\xE2\xE3\xCF\xD3\nfake boleto".b }
    let(:pdf_path) { "/cobranca/v3/cobrancas/req-1/pdf" }

    it "decodes the base64 `pdf` field of the JSON response" do
      stub_inter_api(:get, pdf_path, status: 200,
                                     body: { pdf: Base64.strict_encode64(pdf_bytes) }.to_json,
                                     headers: { "Content-Type" => "application/json" })

      expect(client.boleto_pdf("req-1")).to eq(pdf_bytes)
    end

    it "accepts a raw PDF body" do
      stub_inter_api(:get, pdf_path, status: 200, body: pdf_bytes,
                                     headers: { "Content-Type" => "application/pdf" })

      expect(client.boleto_pdf("req-1")).to eq(pdf_bytes)
    end

    it "raises UnexpectedResponseError when the JSON has no pdf field" do
      stub_inter_api(:get, pdf_path, status: 200, body: { other: "x" }.to_json)

      expect { client.boleto_pdf("req-1") }
        .to raise_error(SchoolLab::Integrations::Inter::UnexpectedResponseError)
    end

    it "raises UnexpectedResponseError when the base64 is not valid" do
      stub_inter_api(:get, pdf_path, status: 200, body: { pdf: "%%%not-base64" }.to_json)

      expect { client.boleto_pdf("req-1") }
        .to raise_error(SchoolLab::Integrations::Inter::UnexpectedResponseError)
    end

    it "raises UnexpectedResponseError when the decoded bytes are not a PDF" do
      stub_inter_api(:get, pdf_path, status: 200, body: { pdf: Base64.strict_encode64("<html>") }.to_json)

      expect { client.boleto_pdf("req-1") }
        .to raise_error(SchoolLab::Integrations::Inter::UnexpectedResponseError)
    end

    it "maps a 404 from the provider to UnexpectedResponseError and a 5xx to TransientError" do
      stub_inter_api(:get, pdf_path, status: 404, body: "{}")
      expect { client.boleto_pdf("req-1") }
        .to raise_error(SchoolLab::Integrations::Inter::UnexpectedResponseError)

      stub_inter_api(:get, pdf_path, status: 503, body: "")
      expect { client.boleto_pdf("req-1") }.to raise_error(SchoolLab::Integrations::Inter::TransientError)
    end

    it "url-encodes the request id so it cannot alter the path" do
      stub_inter_api(:get, "/cobranca/v3/cobrancas/a%2Fb/pdf", status: 200, body: pdf_bytes)

      expect(client.boleto_pdf("a/b")).to eq(pdf_bytes)
    end
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
