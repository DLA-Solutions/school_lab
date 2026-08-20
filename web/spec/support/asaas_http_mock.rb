# frozen_string_literal: true

ASAAS_TEST_API_BASE_URL = "https://asaas.test"

module AsaasHttpMock
  def stub_asaas_api(method, path, query: nil, **options)
    base = ENV.fetch("ASAAS_API_BASE_URL", ASAAS_TEST_API_BASE_URL).chomp("/")
    stub = stub_request(method, "#{base}#{path}")
    if query.present?
      normalized = query.transform_keys(&:to_s).transform_values { |value| value.to_s }
      stub = stub.with(query: normalized)
    end
    stub = stub.to_return(**options) if options.any?
    stub
  end

  def with_asaas_env(api_token: "test-token", api_base_url: ASAAS_TEST_API_BASE_URL)
    original_token = ENV["ASAAS_API_TOKEN"]
    original_base = ENV["ASAAS_API_BASE_URL"]
    ENV["ASAAS_API_TOKEN"] = api_token
    ENV["ASAAS_API_BASE_URL"] = api_base_url
    yield
  ensure
    original_token.nil? ? ENV.delete("ASAAS_API_TOKEN") : ENV["ASAAS_API_TOKEN"] = original_token
    original_base.nil? ? ENV.delete("ASAAS_API_BASE_URL") : ENV["ASAAS_API_BASE_URL"] = original_base
  end
end

RSpec.configure do |config|
  config.include AsaasHttpMock, :asaas
end
