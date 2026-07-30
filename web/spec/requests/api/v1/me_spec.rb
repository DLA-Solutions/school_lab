# frozen_string_literal: true

require "swagger_helper"

RSpec.describe "Api::V1::Me", type: :request do
  let(:school1) { create(:school, name: "School One") }
  let(:school2) { create(:school, name: "School Two") }
  let(:user) { create(:user) }
  let!(:membership1) { create(:membership, user: user, school: school1, role: "guardian", status: "active") }
  let!(:membership2) { create(:membership, user: user, school: school2, role: "school", status: "active") }
  let(:Authorization) { auth_headers_for(user)["Authorization"] }

  path "/api/v1/me" do
    get "Current user profile" do
      tags "Me"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string

      response "200", "memberships returned" do
        run_test! do |response|
          body = JSON.parse(response.body)
          memberships = body.dig("data", "memberships")
          expect(memberships.size).to eq(2)
          school_ids = memberships.map { |m| m["school_id"] }
          expect(school_ids).to contain_exactly(school1.id, school2.id)
          memberships.each do |membership|
            expect(membership).to include("role", "status", "school_name")
          end
        end
      end

      response "401", "unauthenticated" do
        let(:Authorization) { nil }

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.dig("error", "code")).to eq("unauthorized")
        end
      end
    end
  end

  path "/api/v1/me/device_tokens" do
    post "Register device token" do
      tags "Me"
      consumes "application/json"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string
      parameter name: :payload, in: :body, schema: {
        type: :object,
        properties: {
          device_token: {
            type: :object,
            properties: {
              token: { type: :string },
              platform: { type: :string, enum: %w[ios android web] }
            },
            required: %w[token platform]
          }
        },
        required: %w[device_token]
      }

      response "201", "device token registered" do
        let(:payload) { { device_token: { token: "fcm-abc-123", platform: "android" } } }

        run_test! do |response|
          expect(DeviceToken.kept.find_by(user: user, token: "fcm-abc-123")).to be_present
          body = JSON.parse(response.body)
          expect(body.dig("data", "token")).to eq("fcm-abc-123")
        end
      end
    end
  end
end
