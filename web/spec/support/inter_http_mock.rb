# frozen_string_literal: true

INTER_TEST_API_BASE_URL = "https://inter.test"
INTER_TEST_TOKEN_URL = "https://inter.test/oauth/v2/token"
INTER_ALT_API_BASE_URL = "https://inter-alt.test"
INTER_ALT_TOKEN_URL = "https://inter-alt.test/oauth/v2/token"

module InterHttpMock
  def stub_inter_token(response_body: { access_token: "token-abc", expires_in: 3_600 })
    stub_request(:post, ENV.fetch("INTER_TOKEN_URL"))
      .to_return(status: 200, body: response_body.to_json, headers: { "Content-Type" => "application/json" })
  end

  def stub_inter_api(method, path, **options)
    base = ENV.fetch("INTER_API_BASE_URL").chomp("/")
    stub = stub_request(method, "#{base}#{path}")
    stub = stub.to_return(**options) if options.any?
    stub
  end

  def with_inter_billing_urls(api_base_url:, token_url:)
    original_api = ENV["INTER_API_BASE_URL"]
    original_token = ENV["INTER_TOKEN_URL"]

    if api_base_url.nil?
      ENV.delete("INTER_API_BASE_URL")
    else
      ENV["INTER_API_BASE_URL"] = api_base_url
    end

    if token_url.nil?
      ENV.delete("INTER_TOKEN_URL")
    else
      ENV["INTER_TOKEN_URL"] = token_url
    end

    yield
  ensure
    if original_api.nil?
      ENV.delete("INTER_API_BASE_URL")
    else
      ENV["INTER_API_BASE_URL"] = original_api
    end

    if original_token.nil?
      ENV.delete("INTER_TOKEN_URL")
    else
      ENV["INTER_TOKEN_URL"] = original_token
    end
  end
end

RSpec.configure do |config|
  config.include InterHttpMock

  config.before do
    ENV["INTER_API_BASE_URL"] = INTER_TEST_API_BASE_URL
    ENV["INTER_TOKEN_URL"] = INTER_TEST_TOKEN_URL
  end
end
