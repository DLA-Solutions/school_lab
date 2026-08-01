# frozen_string_literal: true

require "rails_helper"
require "net/http"

RSpec.describe "HTTP isolation" do
  it "blocks unstubbed outbound HTTP requests" do
    VCR.turn_off!

    expect do
      Net::HTTP.get(URI("https://example.com"))
    end.to raise_error(WebMock::NetConnectNotAllowedError)
  ensure
    VCR.turn_on!
  end

  it "allows connections to localhost" do
    stub_request(:get, "http://localhost:3000/health").to_return(status: 200, body: "ok")

    expect(Net::HTTP.get(URI("http://localhost:3000/health"))).to eq("ok")
  end
end
