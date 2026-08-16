# frozen_string_literal: true

require "swagger_helper"

RSpec.describe "Api::V1::Schools::Billing::Purposes", type: :request do
  let(:school) { create(:school) }
  let(:other_school) { create(:school) }
  let(:school_admin) { create(:user) }
  let!(:school_admin_membership) { create(:membership, :school_admin, user: school_admin, school: school) }
  let(:guardian_user) { create(:user) }
  let!(:guardian_membership) { create(:membership, user: guardian_user, school: school, role: "guardian") }
  let(:school_id) { school.id }
  let(:Authorization) { auth_headers_for(school_admin)["Authorization"] }

  path "/api/v1/schools/{school_id}/billing/purposes" do
    parameter name: :school_id, in: :path, type: :integer

    get "List billing purposes" do
      tags "Billing"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string

      response "200", "returns seeded default purposes" do
        run_test! do |response|
          body = JSON.parse(response.body).fetch("data")
          codes = body.pluck("code")
          expect(codes).to include("tuition", "enrollment")
          expect(body.all? { |row| row["tax_declaration_eligible"] == false }).to be(true)
        end
      end

      response "403", "forbidden for guardian" do
        let(:Authorization) { auth_headers_for(guardian_user)["Authorization"] }

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.dig("error", "code")).to eq("forbidden")
        end
      end
    end

    post "Create billing purpose" do
      tags "Billing"
      consumes "application/json"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string
      parameter name: :payload, in: :body, schema: {
        type: :object,
        properties: {
          billing_purpose: {
            type: :object,
            properties: {
              code: { type: :string },
              name: { type: :string }
            },
            required: %w[code name]
          }
        },
        required: %w[billing_purpose]
      }

      response "201", "creates a school purpose" do
        let(:payload) { { billing_purpose: { code: "material", name: "Material didático" } } }

        run_test! do |response|
          body = JSON.parse(response.body).fetch("data")
          expect(body["code"]).to eq("material")
          expect(body["tax_declaration_eligible"]).to be(false)
        end
      end

      response "422", "validation error for duplicate code" do
        let!(:existing) { create(:billing_purpose, :tuition, school: school) }
        let(:payload) { { billing_purpose: { code: "tuition", name: "Duplicate" } } }

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.dig("error", "code")).to eq("validation_error")
        end
      end
    end
  end

  path "/api/v1/schools/{school_id}/billing/purposes/{id}" do
    parameter name: :school_id, in: :path, type: :integer
    parameter name: :id, in: :path, type: :integer

    patch "Update billing purpose eligibility" do
      tags "Billing"
      consumes "application/json"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string
      parameter name: :payload, in: :body, schema: {
        type: :object,
        properties: {
          billing_purpose: {
            type: :object,
            properties: {
              tax_declaration_eligible: { type: :boolean },
              acknowledge_legal_ownership: { type: :boolean }
            }
          }
        },
        required: %w[billing_purpose]
      }

      response "200", "updates future-charge eligibility and approves configuration" do
        let!(:purpose) { create(:billing_purpose, :tuition, school: school) }
        let(:id) { purpose.id }
        let(:payload) do
          {
            billing_purpose: {
              tax_declaration_eligible: true,
              acknowledge_legal_ownership: true
            }
          }
        end

        run_test! do |response|
          body = JSON.parse(response.body).fetch("data")
          expect(body["tax_declaration_eligible"]).to be(true)

          settings = TaxDeclarationSetting.find_by!(school: school)
          expect(settings.approved_purpose_configuration_digest).to be_present
          expect(settings.legal_accounting_approved_at).to be_present
        end
      end

      response "404", "not found for another school" do
        let!(:purpose) { create(:billing_purpose, :tuition, school: other_school) }
        let(:id) { purpose.id }
        let(:payload) { { billing_purpose: { tax_declaration_eligible: true } } }

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.dig("error", "code")).to eq("not_found")
        end
      end
    end
  end
end
