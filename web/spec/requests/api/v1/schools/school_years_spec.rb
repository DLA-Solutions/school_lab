# frozen_string_literal: true

require "swagger_helper"

RSpec.describe "Api::V1::Schools::SchoolYears", type: :request do
  let(:school) { create(:school) }
  let(:school_id) { school.id }
  let(:owner_user) { create(:user) }
  let!(:owner_membership) { create_owner_membership(school, user: owner_user).last }
  let(:secretary_user) { create(:user) }
  let!(:secretary_membership) { create(:membership, :staff, user: secretary_user, school: school) }
  let(:secretary_template) { create_system_templates_for(school).find { |t| t.system_key == "secretary" } }
  let(:Authorization) { auth_headers_for(owner_user)["Authorization"] }
  let(:id) { 1 }

  def assign_secretary_profile!
    create(:staff_profile, membership: secretary_membership, school: school, role_template: secretary_template)
  end

  path "/api/v1/schools/{school_id}/school_years" do
    parameter name: :school_id, in: :path, type: :integer

    get "List school years (phase 4C.1)" do
      tags "Platform", "School Years"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string
      parameter name: :status, in: :query, type: :string, required: false,
                description: "Filter by status (draft, active, archived)"

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

    post "Create school year (phase 4C.1)" do
      tags "Platform", "School Years"
      consumes "application/json"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string
      parameter name: :payload, in: :body, schema: {
        type: :object,
        properties: {
          name: { type: :string },
          starts_on: { type: :string, format: :date },
          ends_on: { type: :string, format: :date },
          period_template: { type: :string, enum: %w[bimester trimester custom] }
        },
        required: %w[name starts_on ends_on]
      }

      response "501", "not implemented" do
        let(:payload) do
          {
            name: "2026",
            starts_on: "2026-02-01",
            ends_on: "2026-12-15",
            period_template: "trimester"
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
            name: "2026",
            starts_on: "2026-02-01",
            ends_on: "2026-12-15"
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

  path "/api/v1/schools/{school_id}/school_years/active" do
    parameter name: :school_id, in: :path, type: :integer

    get "Show active school year (phase 4C.1)" do
      tags "Platform", "School Years"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string

      response "501", "not implemented for active staff" do
        let(:Authorization) { auth_headers_for(secretary_user)["Authorization"] }

        before { assign_secretary_profile! }

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.dig("error", "code")).to eq("not_implemented")
        end
      end
    end
  end

  path "/api/v1/schools/{school_id}/school_years/{id}" do
    parameter name: :school_id, in: :path, type: :integer
    parameter name: :id, in: :path, type: :integer

    get "Show school year (phase 4C.1)" do
      tags "Platform", "School Years"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string
      parameter name: "include", in: :query, type: :string, required: false,
                description: "Optional embeds: periods,holidays"

      response "501", "not implemented" do
        let(:'include') { nil }

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.dig("error", "code")).to eq("not_implemented")
        end
      end
    end

    patch "Update school year (phase 4C.1)" do
      tags "Platform", "School Years"
      consumes "application/json"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string
      parameter name: :payload, in: :body, schema: {
        type: :object,
        properties: {
          name: { type: :string },
          starts_on: { type: :string, format: :date },
          ends_on: { type: :string, format: :date }
        }
      }

      response "501", "not implemented" do
        let(:payload) { { name: "2026 updated" } }

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.dig("error", "code")).to eq("not_implemented")
        end
      end

      response "403", "forbidden without manage_school_settings" do
        let(:Authorization) { auth_headers_for(secretary_user)["Authorization"] }
        let(:payload) { { name: "2026 updated" } }

        before { assign_secretary_profile! }

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.dig("error", "code")).to eq("forbidden")
        end
      end
    end

    delete "Delete school year (phase 4C.1)" do
      tags "Platform", "School Years"
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

  path "/api/v1/schools/{school_id}/school_years/{id}/activate" do
    parameter name: :school_id, in: :path, type: :integer
    parameter name: :id, in: :path, type: :integer

    post "Activate school year (phase 4C.1)" do
      tags "Platform", "School Years"
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

  path "/api/v1/schools/{school_id}/school_years/{id}/archive" do
    parameter name: :school_id, in: :path, type: :integer
    parameter name: :id, in: :path, type: :integer

    post "Archive school year (phase 4C.1)" do
      tags "Platform", "School Years"
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

RSpec.describe "Unauthenticated school year access", type: :request do
  let(:school) { create(:school) }

  it "denies school-scoped access with 401" do
    get "/api/v1/schools/#{school.id}/school_years"

    expect(response).to have_http_status(:unauthorized)
    expect(JSON.parse(response.body).dig("error", "code")).to eq("unauthorized")
  end
end
