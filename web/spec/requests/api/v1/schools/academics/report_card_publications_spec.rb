# frozen_string_literal: true

require "swagger_helper"

RSpec.describe "Api::V1::Schools::Academics::ReportCardPublications", type: :request do
  include PermissionsFactoryHelpers

  let(:school) { create(:school) }
  let(:school_id) { school.id }
  let(:owner_user) { create(:user) }
  let!(:owner_membership) { create_owner_membership(school, user: owner_user).last }
  let(:Authorization) { auth_headers_for(owner_user)["Authorization"] }

  let!(:publication) { create(:report_card_publication, school: school) }
  let!(:snapshot) do
    create(:report_card_snapshot, school: school, report_card_publication: publication, version: 1)
  end

  before { publication.update!(active_snapshot: snapshot) }

  path "/api/v1/schools/{school_id}/academics/report_card_publications/{id}/republish" do
    parameter name: :school_id, in: :path, type: :integer
    parameter name: :id, in: :path, type: :integer

    post "Republish report card" do
      tags "Report Cards", "Academic"
      consumes "application/json"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string
      parameter name: :payload, in: :body, schema: {
        type: :object,
        properties: {
          report_card_publication: {
            type: :object,
            properties: {
              correction_reason: { type: :string }
            }
          }
        }
      }

      let(:id) { publication.id }
      let(:payload) do
        { report_card_publication: { correction_reason: "" } }
      end

      response "422", "requires correction reason" do
        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.dig("error", "code")).to eq("republish_reason_required")
        end
      end
    end
  end
end
