# frozen_string_literal: true

require "rails_helper"

RSpec.describe "Api::V1::Me unauthenticated", type: :request do
  it "returns 401 without Authorization header" do
    get "/api/v1/me"

    expect(response).to have_http_status(:unauthorized)
    expect(json.dig("error", "code")).to eq("unauthorized")
  end
end
