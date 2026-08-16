# frozen_string_literal: true

require "swagger_helper"

RSpec.describe "Api::V1::Schools::SchoolYears", type: :request do
  let(:school) { create(:school) }
  let(:other_school) { create(:school) }
  let(:school_id) { school.id }
  let(:owner_user) { create(:user) }
  let!(:owner_membership) { create_owner_membership(school, user: owner_user).last }
  let(:secretary_user) { create(:user) }
  let!(:secretary_membership) { create(:membership, :staff, user: secretary_user, school: school) }
  let(:guardian_user) { create(:user) }
  let!(:guardian_membership) { create(:membership, user: guardian_user, school: school, role: "guardian") }
  let(:secretary_template) { create_system_templates_for(school).find { |t| t.system_key == "secretary" } }
  let(:Authorization) { auth_headers_for(owner_user)["Authorization"] }

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

      response "403", "forbidden for guardian" do
        let(:Authorization) { auth_headers_for(guardian_user)["Authorization"] }

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "code")).to eq("forbidden")
        end
      end

      response "200", "paginated list for staff" do
        before { create(:school_year, school: school, name: "2026") }

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body["data"].size).to eq(1)
          expect(body["meta"]).to include("page", "per_page", "total")
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

      response "201", "creates draft year with trimester periods" do
        let(:payload) do
          {
            name: "2026",
            starts_on: "2026-02-01",
            ends_on: "2026-12-15",
            period_template: "trimester"
          }
        end

        run_test! do |response|
          body = JSON.parse(response.body).fetch("data")
          expect(body["status"]).to eq("draft")
          expect(body["period_template"]).to eq("trimester")
          expect(body["timezone"]).to eq("America/Sao_Paulo")
          periods = body["academic_periods"]
          expect(periods.size).to eq(3)
          expect(periods.pluck("name")).to eq([ "1º trimestre", "2º trimestre", "3º trimestre" ])
          expect(periods.pluck("sequence")).to eq([ 1, 2, 3 ])
          expect(periods.first["starts_on"]).to eq("2026-02-01")
          expect(periods.last["ends_on"]).to eq("2026-12-15")
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
          expect(JSON.parse(response.body).dig("error", "code")).to eq("forbidden")
        end
      end

      response "422", "validation error for invalid dates" do
        let(:payload) do
          {
            name: "2026",
            starts_on: "2026-12-15",
            ends_on: "2026-02-01"
          }
        end

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "code")).to eq("validation_error")
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

      response "200", "returns active year with embedded collections" do
        let!(:active_year) do
          year = create(:school_year, :active, school: school, name: "2026")
          create(:school_holiday, school_year: year)
          year
        end

        run_test! do |response|
          body = JSON.parse(response.body).fetch("data")
          expect(body["id"]).to eq(active_year.id)
          expect(body["academic_periods"]).to be_present
          expect(body["school_holidays"]).to be_present
        end
      end

      response "422", "no active school year" do
        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "code")).to eq("no_active_school_year")
        end
      end

      response "403", "forbidden for guardian" do
        let(:Authorization) { auth_headers_for(guardian_user)["Authorization"] }

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "code")).to eq("forbidden")
        end
      end

      response "404", "cross-school access" do
        let(:school_id) { other_school.id }

        before { create(:school_year, :active, school: other_school, name: "2026") }

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "code")).to eq("not_found")
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

      let!(:school_year) { create(:school_year, school: school, name: "2026") }
      let(:id) { school_year.id }

      response "200", "show year" do
        let(:'include') { nil }

        run_test! do |response|
          body = JSON.parse(response.body).fetch("data")
          expect(body["name"]).to eq("2026")
        end
      end

      response "404", "cross-school access" do
        let(:school_id) { other_school.id }
        let(:'include') { nil }

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "code")).to eq("not_found")
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

      let!(:school_year) { create(:school_year, school: school, name: "2026") }
      let(:id) { school_year.id }

      response "200", "updates draft year" do
        let(:payload) { { name: "2026 updated" } }

        run_test! do |response|
          expect(JSON.parse(response.body).dig("data", "name")).to eq("2026 updated")
        end
      end

      response "409", "invalid state transition on active year" do
        let!(:school_year) { create(:school_year, :active, school: school, name: "2026") }
        let(:payload) { { name: "2026 updated" } }

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "code")).to eq("invalid_state_transition")
        end
      end

      response "403", "forbidden without manage_school_settings" do
        let(:Authorization) { auth_headers_for(secretary_user)["Authorization"] }
        let(:payload) { { name: "2026 updated" } }

        before { assign_secretary_profile! }

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "code")).to eq("forbidden")
        end
      end
    end

    delete "Delete school year (phase 4C.1)" do
      tags "Platform", "School Years"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string

      let!(:school_year) { create(:school_year, school: school, name: "2026") }
      let(:id) { school_year.id }

      response "204", "soft deletes draft year" do
        run_test! do |response|
          expect(response.body).to be_blank
          expect(school_year.reload.discarded?).to be(true)
        end
      end

      response "409", "year in use" do
        before do
          allow(SchoolYears::YearInUseGuard).to receive(:call).and_return(
            ResponseService.failure(
              code: :year_in_use,
              details: { enrollments_count: 42, charges_count: 15 }
            )
          )
        end

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.dig("error", "code")).to eq("year_in_use")
          expect(body.dig("error", "details", "enrollments_count")).to eq(42)
        end
      end

      response "403", "forbidden without manage_school_settings" do
        let(:Authorization) { auth_headers_for(secretary_user)["Authorization"] }

        before { assign_secretary_profile! }

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "code")).to eq("forbidden")
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

      response "200", "activates draft year and archives prior active year" do
        let!(:prior_active) { create(:school_year, :active, school: school, name: "2025") }
        let!(:school_year) do
          year = create(:school_year, :custom, school: school, name: "2026")
          create(:academic_period, school_year: year, sequence: 1)
          year
        end
        let(:id) { school_year.id }

        run_test! do |response|
          body = JSON.parse(response.body).fetch("data")
          expect(body["status"]).to eq("active")
          expect(body["archived_year_id"]).to eq(prior_active.id)
          expect(prior_active.reload.status).to eq("archived")
        end
      end

      response "409", "activate without periods" do
        let!(:school_year) { create(:school_year, :custom, school: school, name: "2026") }
        let(:id) { school_year.id }

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.dig("error", "code")).to eq("invalid_state_transition")
          expect(body.dig("error", "details", "requirement")).to eq("at_least_one_period")
        end
      end

      response "422", "period overlap blocks activate" do
        let!(:school_year) do
          year = create(:school_year, :custom, school: school, name: "2026")
          ActiveRecord::Base.connection.execute(
            "ALTER TABLE academic_periods DROP CONSTRAINT IF EXISTS academic_periods_no_overlap_kept"
          )
          create(:academic_period,
                 school_year: year,
                 sequence: 1,
                 starts_on: Date.new(2026, 2, 1),
                 ends_on: Date.new(2026, 4, 30))
          create(:academic_period,
                 school_year: year,
                 sequence: 2,
                 starts_on: Date.new(2026, 4, 1),
                 ends_on: Date.new(2026, 6, 30))
          year
        end
        let(:id) { school_year.id }

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "code")).to eq("period_overlap")
          expect(school_year.reload.status).to eq("draft")
        end
      end

      response "403", "forbidden without manage_school_settings" do
        let(:Authorization) { auth_headers_for(secretary_user)["Authorization"] }
        let!(:school_year) { create(:school_year, school: school) }
        let(:id) { school_year.id }

        before { assign_secretary_profile! }

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "code")).to eq("forbidden")
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

      let!(:school_year) { create(:school_year, :active, school: school, name: "2026") }
      let(:id) { school_year.id }

      response "200", "archives active year" do
        run_test! do |response|
          expect(JSON.parse(response.body).dig("data", "status")).to eq("archived")
        end
      end

      response "403", "forbidden without manage_school_settings" do
        let(:Authorization) { auth_headers_for(secretary_user)["Authorization"] }

        before { assign_secretary_profile! }

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "code")).to eq("forbidden")
        end
      end
    end
  end
end

RSpec.describe "Api::V1::Schools::SchoolYears provisioning", type: :request do
  let(:provisioning_school) { create(:school, :provisioning) }
  let(:backoffice_user) { create(:user) }
  let!(:backoffice_membership) { create(:membership, :with_provision_school, user: backoffice_user) }

  it "allows backoffice to create the first school year during provisioning" do
    post "/api/v1/schools/#{provisioning_school.id}/school_years",
         params: {
           name: "2026",
           starts_on: "2026-02-01",
           ends_on: "2026-12-15",
           period_template: "trimester"
         },
         headers: auth_headers_for(backoffice_user),
         as: :json

    expect(response).to have_http_status(:created)
    body = JSON.parse(response.body).fetch("data")
    expect(body["academic_periods"].size).to eq(3)
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
