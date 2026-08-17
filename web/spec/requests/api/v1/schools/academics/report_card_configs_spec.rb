# frozen_string_literal: true

require "swagger_helper"

RSpec.describe "Api::V1::Schools::Academics::ReportCardConfigs", type: :request do
  include PermissionsFactoryHelpers

  let(:school) { create(:school) }
  let(:school_id) { school.id }
  let(:owner_user) { create(:user) }
  let!(:owner_membership) { create_owner_membership(school, user: owner_user).last }
  let(:Authorization) { auth_headers_for(owner_user)["Authorization"] }
  let!(:signatory) { create(:document_signatory, school: school) }

  path "/api/v1/schools/{school_id}/academics/report_card_config" do
    parameter name: :school_id, in: :path, type: :integer

    get "Show report card config" do
      tags "Report Cards", "Academic"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string

      response "404", "missing config" do
        run_test!
      end

      response "200", "returns current config" do
        before do
          create(:report_card_config, school: school, document_signatory: signatory,
                                      created_by_membership: owner_membership, version: 1)
        end

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.dig("data", "version")).to eq(1)
        end
      end
    end

    patch "Update report card config" do
      tags "Report Cards", "Academic"
      consumes "application/json"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string
      parameter name: :payload, in: :body, schema: {
        type: :object,
        properties: {
          report_card_config: {
            type: :object,
            properties: {
              document_signatory_id: { type: :integer },
              template_key: { type: :string },
              display_config: { type: :object }
            }
          }
        }
      }

      let(:payload) do
        {
          report_card_config: {
            document_signatory_id: signatory.id,
            template_key: "standard_v1",
            display_config: { hide_discipline_ids: [] }
          }
        }
      end

      response "200", "creates next config version" do
        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.dig("data", "version")).to eq(1)
        end
      end
    end
  end
end
