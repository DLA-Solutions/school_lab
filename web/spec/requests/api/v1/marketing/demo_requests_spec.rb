# frozen_string_literal: true

require "swagger_helper"

RSpec.describe "Api::V1::Marketing::DemoRequests", type: :request do
  let(:payload) do
    {
      name: "Maria Silva",
      email: "maria@example.com",
      phone: "+55 11 99999-0000"
    }
  end

  around do |example|
    original_cache = Rails.cache
    Rails.cache = ActiveSupport::Cache.lookup_store(:memory_store)
    Rails.cache.clear
    example.run
  ensure
    Rails.cache = original_cache
  end

  path "/api/v1/marketing/demo_request" do
    post "Submit marketing demo request" do
      tags "Marketing"
      consumes "application/json"
      produces "application/json"
      parameter name: :payload, in: :body, schema: {
        type: :object,
        properties: {
          name: { type: :string },
          email: { type: :string },
          phone: { type: :string },
          website: { type: :string, description: "Honeypot field; must stay empty." },
          _hp: { type: :string, description: "Alternate honeypot field; must stay empty." }
        },
        required: %w[name email phone]
      }

      response "204", "demo request accepted" do
        run_test! do
          expect(response.body).to be_blank
        end
      end

      response "422", "validation error" do
        let(:payload) { { name: "", email: "invalid", phone: "" } }

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.dig("error", "code")).to eq("validation_error")
          expect(body.dig("error", "details")).to include("name", "email", "phone")
        end
      end

      response "429", "rate limited on repeated submit" do
        before do
          post "/api/v1/marketing/demo_request", params: payload, as: :json
          expect(response).to have_http_status(:no_content)
        end

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "code")).to eq("rate_limited")
        end
      end
    end
  end
end
