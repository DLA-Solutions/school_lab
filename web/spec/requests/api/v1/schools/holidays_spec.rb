# frozen_string_literal: true

require "swagger_helper"

RSpec.describe "Api::V1::Schools::Holidays", type: :request do
  let(:school) { create(:school) }
  let(:school_id) { school.id }
  let(:school_year_id) { 1 }
  let(:id) { 1 }
  let(:owner_user) { create(:user) }
  let!(:owner_membership) { create_owner_membership(school, user: owner_user).last }
  let(:secretary_user) { create(:user) }
  let!(:secretary_membership) { create(:membership, :staff, user: secretary_user, school: school) }
  let(:secretary_template) { create_system_templates_for(school).find { |t| t.system_key == "secretary" } }
  let(:Authorization) { auth_headers_for(owner_user)["Authorization"] }

  def assign_secretary_profile!
    create(:staff_profile, membership: secretary_membership, school: school, role_template: secretary_template)
  end

  path "/api/v1/schools/{school_id}/school_years/{school_year_id}/holidays" do
    parameter name: :school_id, in: :path, type: :integer
    parameter name: :school_year_id, in: :path, type: :integer

    get "List holidays (phase 4C.1)" do
      tags "Platform", "Holidays"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string

      response "401", "unauthenticated" do
        let(:Authorization) { nil }

        run_test!
      end

      response "501", "not implemented" do
        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.dig("error", "code")).to eq("not_implemented")
        end
      end
    end

    post "Create holiday (phase 4C.1)" do
      tags "Platform", "Holidays"
      consumes "application/json"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string
      parameter name: :payload, in: :body, schema: {
        type: :object,
        properties: {
          date: { type: :string, format: :date },
          name: { type: :string },
          applies_to_attendance: { type: :boolean }
        },
        required: %w[date name]
      }

      response "501", "not implemented" do
        let(:payload) do
          {
            date: "2026-04-21",
            name: "Tiradentes",
            applies_to_attendance: true
          }
        end

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.dig("error", "code")).to eq("not_implemented")
        end
      end

      response "403", "forbidden without manage_school_settings" do
        let(:Authorization) { auth_headers_for(secretary_user)["Authorization"] }
        let(:payload) do
          {
            date: "2026-04-21",
            name: "Tiradentes",
            applies_to_attendance: true
          }
        end

        before { assign_secretary_profile! }

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.dig("error", "code")).to eq("forbidden")
        end
      end
    end
  end

  path "/api/v1/schools/{school_id}/holidays/{id}" do
    parameter name: :school_id, in: :path, type: :integer
    parameter name: :id, in: :path, type: :integer

    patch "Update holiday (phase 4C.1)" do
      tags "Platform", "Holidays"
      consumes "application/json"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string
      parameter name: :payload, in: :body, schema: {
        type: :object,
        properties: {
          date: { type: :string, format: :date },
          name: { type: :string },
          applies_to_attendance: { type: :boolean }
        }
      }

      response "501", "not implemented" do
        let(:payload) { { name: "Tiradentes updated" } }

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.dig("error", "code")).to eq("not_implemented")
        end
      end

      response "403", "forbidden without manage_school_settings" do
        let(:Authorization) { auth_headers_for(secretary_user)["Authorization"] }
        let(:payload) { { name: "Tiradentes updated" } }

        before { assign_secretary_profile! }

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.dig("error", "code")).to eq("forbidden")
        end
      end
    end

    delete "Delete holiday (phase 4C.1)" do
      tags "Platform", "Holidays"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string

      response "501", "not implemented" do
        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.dig("error", "code")).to eq("not_implemented")
        end
      end

      response "403", "forbidden without manage_school_settings" do
        let(:Authorization) { auth_headers_for(secretary_user)["Authorization"] }

        before { assign_secretary_profile! }

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.dig("error", "code")).to eq("forbidden")
        end
      end
    end
  end
end

RSpec.describe "Unauthenticated holiday access", type: :request do
  let(:school) { create(:school) }

  it "denies school-scoped access with 401" do
    get "/api/v1/schools/#{school.id}/school_years/1/holidays"

    expect(response).to have_http_status(:unauthorized)
    expect(JSON.parse(response.body).dig("error", "code")).to eq("unauthorized")
  end
end
