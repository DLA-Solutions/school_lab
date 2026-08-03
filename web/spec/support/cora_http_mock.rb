# frozen_string_literal: true

CORA_TEST_API_BASE_URL = "https://cora.test"
CORA_TEST_TOKEN_URL = "https://cora.test/token"
CORA_ALT_API_BASE_URL = "https://cora-alt.test"
CORA_ALT_TOKEN_URL = "https://cora-alt.test/token"

module CoraHttpMock
  def stub_cora_token(response_body: { access_token: "token-abc", expires_in: 86_400 })
    stub_request(:post, ENV.fetch("CORA_TOKEN_URL"))
      .to_return(status: 200, body: response_body.to_json, headers: { "Content-Type" => "application/json" })
  end

  def stub_cora_api(method, path, **options)
    base = ENV.fetch("CORA_API_BASE_URL").chomp("/")
    stub = stub_request(method, "#{base}#{path}")
    stub = stub.to_return(**options) if options.any?
    stub
  end

  def with_cora_billing_urls(api_base_url:, token_url:)
    original_api = ENV["CORA_API_BASE_URL"]
    original_token = ENV["CORA_TOKEN_URL"]

    if api_base_url.nil?
      ENV.delete("CORA_API_BASE_URL")
    else
      ENV["CORA_API_BASE_URL"] = api_base_url
    end

    if token_url.nil?
      ENV.delete("CORA_TOKEN_URL")
    else
      ENV["CORA_TOKEN_URL"] = token_url
    end

    yield
  ensure
    if original_api.nil?
      ENV.delete("CORA_API_BASE_URL")
    else
      ENV["CORA_API_BASE_URL"] = original_api
    end

    if original_token.nil?
      ENV.delete("CORA_TOKEN_URL")
    else
      ENV["CORA_TOKEN_URL"] = original_token
    end
  end
end

RSpec.configure do |config|
  config.include CoraHttpMock

  config.before do
    ENV["CORA_API_BASE_URL"] = CORA_TEST_API_BASE_URL
    ENV["CORA_TOKEN_URL"] = CORA_TEST_TOKEN_URL
  end
end
