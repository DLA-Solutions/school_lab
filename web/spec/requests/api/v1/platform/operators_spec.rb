# frozen_string_literal: true

require "swagger_helper"

OPERATOR_RESPONSE_SCHEMA = {
  type: :object,
  required: %w[data meta],
  properties: {
    data: {
      type: :array,
      items: {
        type: :object,
        required: %w[id email status platform_permissions],
        properties: {
          id: { type: :integer },
          email: { type: :string },
          status: { type: :string },
          platform_permissions: {
            type: :array,
            items: { type: :string }
          }
        }
      }
    },
    meta: {
      type: :object,
      required: %w[page per_page total],
      properties: {
        page: { type: :integer },
        per_page: { type: :integer },
        total: { type: :integer }
      }
    }
  }
}.freeze

RSpec.describe "Api::V1::Platform::Operators", type: :request do
  let(:backoffice_user) { create(:user) }
  let!(:backoffice_membership) { create(:membership, :with_manage_backoffice_ops, user: backoffice_user) }
  let(:staff_user) { create(:user) }
  let(:school) { create(:school) }
  let!(:staff_membership) { create(:membership, :staff, user: staff_user, school: school) }

  path "/api/v1/platform/operators" do
    get "List platform operators" do
      tags "Backoffice", "Platform"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string

      response "200", "backoffice reads operator permissions" do
        schema OPERATOR_RESPONSE_SCHEMA

        let(:Authorization) { auth_headers_for(backoffice_user)["Authorization"] }
        let!(:provision_operator) do
          create(:membership, :with_provision_school, user: create(:user, email: "provisioner@example.com"))
        end

        run_test! do |response|
          body = JSON.parse(response.body)
          emails = body.fetch("data").map { |row| row["email"] }
          expect(emails).to include(backoffice_user.email, "provisioner@example.com")
          expect(emails).not_to include(staff_user.email)

          operator = body.fetch("data").find { |row| row["email"] == backoffice_user.email }
          expect(operator.fetch("platform_permissions")).to include("manage_backoffice_ops")
        end
      end

      response "403", "staff without backoffice role" do
        let(:Authorization) { auth_headers_for(staff_user)["Authorization"] }

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "code")).to eq("backoffice_only")
        end
      end
    end
  end
end
