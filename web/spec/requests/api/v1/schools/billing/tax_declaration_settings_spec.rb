# frozen_string_literal: true

require "swagger_helper"

RSpec.describe "Api::V1::Schools::Billing::TaxDeclarationSettings", type: :request do
  let(:school) { create(:school) }
  let(:other_school) { create(:school) }
  let(:school_admin) { create(:user) }
  let!(:school_admin_membership) { create(:membership, :school_admin, user: school_admin, school: school) }
  let(:guardian_user) { create(:user) }
  let!(:guardian_membership) { create(:membership, user: guardian_user, school: school, role: "guardian") }
  let(:school_id) { school.id }
  let(:Authorization) { auth_headers_for(school_admin)["Authorization"] }
  let!(:signatory) { create(:document_signatory, school: school) }

  path "/api/v1/schools/{school_id}/billing/tax_declaration_settings" do
    parameter name: :school_id, in: :path, type: :integer

    get "Show tax declaration settings" do
      tags "Billing", "Tax Declarations"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string

      response "200", "returns defaults with provisioned purposes" do
        run_test! do |response|
          body = JSON.parse(response.body).fetch("data")
          expect(body["configuration_version"]).to eq(1)
          expect(body["persisted"]).to be(false)
          expect(body["purpose_configuration"].map { |row| row["code"] }).to include("tuition", "enrollment")
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

    patch "Update tax declaration settings" do
      tags "Billing", "Tax Declarations"
      consumes "application/json"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string
      parameter name: :payload, in: :body, schema: {
        type: :object,
        properties: {
          tax_declaration_settings: {
            type: :object,
            properties: {
              legal_text: { type: :string },
              legal_text_version: { type: :string },
              document_signatory_id: { type: :integer },
              acknowledge_legal_ownership: { type: :boolean }
            }
          }
        },
        required: %w[tax_declaration_settings]
      }

      response "200", "persists legal text and signatory" do
        let(:payload) do
          {
            tax_declaration_settings: {
              legal_text: "Declaração anual de pagamentos.",
              legal_text_version: "2026-01",
              document_signatory_id: signatory.id
            }
          }
        end

        run_test! do |response|
          body = JSON.parse(response.body).fetch("data")
          expect(body["legal_text"]).to eq("Declaração anual de pagamentos.")
          expect(body["legal_text_version"]).to eq("2026-01")
          expect(body["document_signatory_id"]).to eq(signatory.id)
          expect(body["persisted"]).to be(true)
        end
      end

      response "404", "not found for another school" do
        let(:school_id) { other_school.id }
        let(:payload) do
          { tax_declaration_settings: { legal_text: "Should not apply" } }
        end

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.dig("error", "code")).to eq("not_found")
        end
      end
    end
  end
end
