# frozen_string_literal: true

require "rails_helper"

RSpec.describe SchoolLab::Middleware::ApiDocsBasicAuth do
  subject(:middleware) { described_class.new(inner_app) }

  let(:inner_app) { ->(_env) { [ 200, { "Content-Type" => "text/plain" }, [ "ok" ] ] } }

  around do |example|
    original_user = ENV["API_DOCS_USERNAME"]
    original_pass = ENV["API_DOCS_PASSWORD"]
    ENV["API_DOCS_USERNAME"] = "docs"
    ENV["API_DOCS_PASSWORD"] = "secret"
    example.run
  ensure
    ENV["API_DOCS_USERNAME"] = original_user
    ENV["API_DOCS_PASSWORD"] = original_pass
  end

  def call(path, authorization: nil)
    env = Rack::MockRequest.env_for(path)
    env["HTTP_AUTHORIZATION"] = authorization if authorization
    middleware.call(env)
  end

  it "passes through non api-docs paths without credentials" do
    status, = call("/api/v1/me")
    expect(status).to eq(200)
  end

  it "returns 401 for api-docs without credentials" do
    status, headers, = call("/api-docs")

    expect(status).to eq(401)
    expect(headers["WWW-Authenticate"]).to include('realm="API Docs"')
  end

  it "returns 401 for api-docs with invalid credentials" do
    status, = call("/api-docs", authorization: "Basic #{Base64.strict_encode64('wrong:creds')}")

    expect(status).to eq(401)
  end

  it "allows api-docs with valid credentials" do
    status, = call("/api-docs", authorization: "Basic #{Base64.strict_encode64('docs:secret')}")

    expect(status).to eq(200)
  end

  it "protects the swagger yaml path" do
    status, = call("/api-docs/v1/swagger.yaml")

    expect(status).to eq(401)
  end
end
