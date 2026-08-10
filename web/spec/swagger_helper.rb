# frozen_string_literal: true

require "rails_helper"
require "rswag/specs"

RSpec.configure do |config|
  config.swagger_root = Rails.root.join("swagger").to_s
  config.swagger_dry_run = false

  config.before(type: :request) do
    host! "www.example.com"
  end

  config.swagger_docs = {
    "v1/swagger.yaml" => {
      openapi: "3.0.1",
      info: {
        title: "School Lab API V1",
        version: "v1"
      },
      paths: {},
      servers: [
        { url: "http://localhost:3000", description: "Development" }
      ],
      components: {
        securitySchemes: {
          bearer_auth: {
            type: :http,
            scheme: :bearer,
            bearerFormat: "JWT"
          }
        }
      }
    }
  }
end
