# frozen_string_literal: true

require "swagger_helper"

SCHOOL_MODULES_RESPONSE_SCHEMA = {
  type: :object,
  required: %w[data],
  properties: {
    data: {
      type: :object,
      required: %w[modules],
      properties: {
        modules: {
          type: :object,
          description: "Module enablement map keyed by module_key",
          additionalProperties: { type: :boolean },
          example: {
            communication: true,
            academic: true,
            billing: false,
            documents: true
          }
        }
      }
    }
  }
}.freeze

RSpec.describe "Api::V1::Schools::Modules", type: :request do
  let(:school) { create(:school) }
  let(:id) { school.id }
  let(:backoffice_user) { create(:user) }
  let!(:backoffice_membership) { create(:membership, :with_manage_backoffice_ops, user: backoffice_user) }
  let(:staff_user) { create(:user) }
  let!(:staff_membership) { create(:membership, :staff, user: staff_user, school: school) }

  before do
    Schools::SeedSchoolModulesService.call(school: school)
  end

  path "/api/v1/schools/{id}/modules" do
    parameter name: :id, in: :path, type: :integer, description: "School tenant identifier"

    get "Show school module flags" do
      tags "Backoffice", "School Modules"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string

      response "200", "backoffice reads module map" do
        schema SCHOOL_MODULES_RESPONSE_SCHEMA

        let(:Authorization) { auth_headers_for(backoffice_user)["Authorization"] }

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.dig("data", "modules")).to include(
            "communication" => true,
            "academic" => true,
            "billing" => true,
            "documents" => true
          )
        end
      end

      response "403", "staff without backoffice role" do
        let(:Authorization) { auth_headers_for(staff_user)["Authorization"] }

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "code")).to eq("backoffice_only")
        end
      end

      response "404", "invalid school id" do
        let(:Authorization) { auth_headers_for(backoffice_user)["Authorization"] }
        let(:id) { 999_999 }

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "code")).to eq("not_found")
        end
      end
    end

    patch "Update school module flags" do
      tags "Backoffice"
      consumes "application/json"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string
      parameter name: :payload, in: :body, schema: {
        type: :object,
        required: %w[modules],
        properties: {
          modules: {
            type: :object,
            additionalProperties: { type: :boolean },
            example: { billing: false }
          }
        }
      }

      response "200", "backoffice disables billing module" do
        schema SCHOOL_MODULES_RESPONSE_SCHEMA

        let(:Authorization) { auth_headers_for(backoffice_user)["Authorization"] }
        let(:payload) { { modules: { billing: false } } }

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.dig("data", "modules", "billing")).to be(false)
          expect(body.dig("data", "modules", "communication")).to be(true)

          billing_module = school.school_modules.find_by!(module_key: "billing")
          expect(billing_module.enabled).to be(false)

          audit = billing_module.audits.where(action: "update").order(:created_at).last
          expect(audit).to be_present
          expect(JSON.parse(audit.comment)).to eq(
            "actor_type" => "backoffice",
            "school_id" => school.id
          )
          expect(audit.associated).to eq(school)
        end
      end

      response "403", "staff without backoffice role" do
        let(:Authorization) { auth_headers_for(staff_user)["Authorization"] }
        let(:payload) { { modules: { billing: false } } }

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "code")).to eq("backoffice_only")
        end
      end

      response "404", "invalid school id" do
        let(:Authorization) { auth_headers_for(backoffice_user)["Authorization"] }
        let(:id) { 999_999 }
        let(:payload) { { modules: { billing: false } } }

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "code")).to eq("not_found")
        end
      end

      response "422", "unknown module key" do
        let(:Authorization) { auth_headers_for(backoffice_user)["Authorization"] }
        let(:payload) { { modules: { unknown_module: true } } }

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "code")).to eq("validation_error")
          expect(SchoolModule.where(module_key: "unknown_module")).to be_none
        end
      end
    end
  end
end
