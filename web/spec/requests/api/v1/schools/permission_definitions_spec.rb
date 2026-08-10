# frozen_string_literal: true

require "swagger_helper"

RSpec.describe "Api::V1::Schools::PermissionDefinitions", type: :request do
  let(:school) { create(:school) }
  let(:school_id) { school.id }
  let(:owner_user) { create(:user) }
  let!(:owner_membership) { create_owner_membership(school, user: owner_user).last }
  let(:Authorization) { auth_headers_for(owner_user)["Authorization"] }

  path "/api/v1/schools/{school_id}/permission_definitions" do
    parameter name: :school_id, in: :path, type: :integer

    get "List permission definitions" do
      tags "Role Templates"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string

      response "200", "returns the platform permission catalog" do
        run_test! do |response|
          body = JSON.parse(response.body)
          definitions = body.dig("data", "definitions")
          expect(definitions).to be_present
          manage_people = definitions.find { |entry| entry["key"] == "manage_people" }
          expect(manage_people).to include("domain" => "people", "scope_kinds" => %w[full partial])
        end
      end
    end
  end
end
