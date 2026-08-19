# frozen_string_literal: true

IUGU_TEST_API_BASE_URL = "https://iugu.test"

module IuguHttpMock
  def stub_iugu_api(method, path, **options)
    base = ENV.fetch("IUGU_API_BASE_URL", IUGU_TEST_API_BASE_URL).chomp("/")
    stub = stub_request(method, "#{base}#{path}")
    stub = stub.to_return(**options) if options.any?
    stub
  end

  def with_iugu_env(api_token: "test-token", api_base_url: IUGU_TEST_API_BASE_URL)
    original_token = ENV["IUGU_API_TOKEN"]
    original_base = ENV["IUGU_API_BASE_URL"]
    ENV["IUGU_API_TOKEN"] = api_token
    ENV["IUGU_API_BASE_URL"] = api_base_url
    yield
  ensure
    original_token.nil? ? ENV.delete("IUGU_API_TOKEN") : ENV["IUGU_API_TOKEN"] = original_token
    original_base.nil? ? ENV.delete("IUGU_API_BASE_URL") : ENV["IUGU_API_BASE_URL"] = original_base
  end
end

RSpec.configure do |config|
  config.include IuguHttpMock, :iugu
end
