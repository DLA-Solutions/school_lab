# frozen_string_literal: true

require "swagger_helper"

# Mirrors SchoolBlueprint#create payload plus meta when backoffice supplies owner_email.
SCHOOL_CREATE_RESPONSE_SCHEMA = {
  type: :object,
  required: %w[data],
  properties: {
    data: {
      type: :object,
      description: "Created school (SchoolBlueprint). Server seeds MVP modules (communication, academic, " \
                   "billing, documents); all enabled by default unless request modules overrides individual flags.",
      required: %w[id onboarding_status onboarding_mode name],
      properties: {
        id: { type: :integer, description: "School tenant identifier" },
        name: { type: :string },
        cnpj: { type: :string, nullable: true },
        address: { type: :string, nullable: true },
        saas_plan: { type: :string, nullable: true },
        school_group_id: { type: :integer, nullable: true },
        onboarding_status: {
          type: :string,
          enum: School::ONBOARDING_STATUSES,
          description: "provisioning when onboarding_mode is white_glove; pending_handoff for backoffice self_serve"
        },
        onboarding_mode: { type: :string, enum: School::ONBOARDING_MODES },
        example: {
          id: 42,
          name: "White Glove Modules School",
          onboarding_status: "provisioning",
          onboarding_mode: "white_glove"
        },
        billing_waived_at: { type: :string, format: "date-time", nullable: true },
        segments_skipped_at: { type: :string, format: "date-time", nullable: true },
        signature_email: { type: :string, nullable: true },
        signs_contracts: { type: :boolean }
      }
    },
    meta: {
      type: :object,
      description: "Present when owner_email was supplied for backoffice provisioning",
      properties: {
        owner_invite_email_status: { type: :string, enum: %w[queued not_configured] }
      }
    }
  }
}.freeze

RSpec.describe "Api::V1::Schools", type: :request do
  let(:backoffice_user) { create(:user) }
  let!(:backoffice_membership) { create(:membership, :with_provision_school, user: backoffice_user) }
  let(:guardian_user) { create(:user) }
  let(:school) { create(:school) }
  let!(:guardian_membership) { create(:membership, user: guardian_user, school: school, role: "guardian") }
  let(:school_admin_user) { create(:user) }
  let!(:school_admin_membership) do
    create(:membership, user: school_admin_user, school: school, role: "school")
  end

  path "/api/v1/schools" do
    get "List schools" do
      tags "Backoffice"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string
      parameter name: :onboarding_status, in: :query, type: :string, required: false,
                enum: %w[provisioning pending_handoff active]
      parameter name: :onboarding_mode, in: :query, type: :string, required: false,
                enum: %w[self_serve white_glove]
      parameter name: :q, in: :query, type: :string, required: false,
                description: "Partial match on name or CNPJ"
      parameter name: :created_after, in: :query, type: :string, required: false,
                description: "ISO date (YYYY-MM-DD)"
      parameter name: :created_before, in: :query, type: :string, required: false,
                description: "ISO date (YYYY-MM-DD)"
      parameter name: :discarded, in: :query, type: :boolean, required: false,
                description: "When true, lists only discarded schools"

      response "200", "schools listed for backoffice" do
        let(:Authorization) { auth_headers_for(backoffice_user)["Authorization"] }
        let!(:listed_school) { create(:school, name: "Listed School") }

        run_test! do |response|
          body = JSON.parse(response.body)
          names = body.fetch("data").map { |row| row["name"] }
          expect(names).to include(listed_school.name)
          expect(body.fetch("meta")).to include("page", "per_page", "total")
        end
      end

      response "200", "schools filtered by onboarding status and mode" do
        let(:Authorization) { auth_headers_for(backoffice_user)["Authorization"] }
        let(:onboarding_status) { "pending_handoff" }
        let(:onboarding_mode) { "white_glove" }
        let!(:matching_school) do
          create(:school, :pending_handoff, name: "Filtered Match", onboarding_mode: "white_glove")
        end
        let!(:other_school) do
          create(:school, :provisioning, name: "Filtered Out")
        end

        run_test! do |response|
          body = JSON.parse(response.body)
          names = body.fetch("data").map { |row| row["name"] }
          expect(names).to eq([ "Filtered Match" ])
        end
      end

      response "200", "schools filtered by q on name" do
        let(:Authorization) { auth_headers_for(backoffice_user)["Authorization"] }
        let(:q) { "Alpha" }
        let!(:alpha_school) { create(:school, name: "Escola Alpha") }
        let!(:beta_school) { create(:school, name: "Escola Beta") }

        run_test! do |response|
          names = JSON.parse(response.body).fetch("data").map { |row| row["name"] }
          expect(names).to include("Escola Alpha")
          expect(names).not_to include("Escola Beta")
        end
      end

      response "200", "schools filtered by created_after" do
        let(:Authorization) { auth_headers_for(backoffice_user)["Authorization"] }
        let(:created_after) { Date.current.iso8601 }
        let!(:recent_school) { create(:school, name: "Recent School", created_at: Time.current) }
        let!(:old_school) do
          create(:school, name: "Old School", created_at: 2.years.ago)
        end

        run_test! do |response|
          names = JSON.parse(response.body).fetch("data").map { |row| row["name"] }
          expect(names).to include("Recent School")
          expect(names).not_to include("Old School")
        end
      end

      response "200", "discarded schools listed when discarded=true" do
        let(:backoffice_ops_user) { create(:user) }
        let!(:backoffice_ops_membership) do
          create(:membership, :with_manage_backoffice_ops, user: backoffice_ops_user)
        end
        let(:Authorization) { auth_headers_for(backoffice_ops_user)["Authorization"] }
        let(:discarded) { true }
        let!(:archived_school) { create(:school, name: "Archived School").tap(&:discard!) }
        let!(:active_school) { create(:school, name: "Active School") }

        run_test! do |response|
          body = JSON.parse(response.body).fetch("data")
          names = body.map { |row| row["name"] }
          expect(names).to include("Archived School")
          expect(names).not_to include("Active School")
          expect(body.first).to have_key("discarded_at")
        end
      end

      response "422", "invalid created_after date" do
        let(:Authorization) { auth_headers_for(backoffice_user)["Authorization"] }
        let(:created_after) { "invalid-date" }

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "code")).to eq("validation_error")
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

    post "Create school" do
      tags "Backoffice"
      description <<~DESC.squish
        Creates a school tenant. Backoffice actors must include school.owner_email; school staff may omit it
        when opening their own school. Set onboarding_mode to self_serve (default) for backoffice self-serve
        provisioning — response data.onboarding_status is pending_handoff. Set onboarding_mode to white_glove
        for assisted onboarding — response data.onboarding_status is provisioning while platform staff configure
        the tenant. All four MVP modules (communication, academic, billing, documents) are seeded enabled
        by default; pass optional modules to override individual flags.
      DESC
      consumes "application/json"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string
      parameter name: :payload, in: :body, schema: {
        type: :object,
        properties: {
          school: {
            type: :object,
            properties: {
              name: { type: :string },
              cnpj: { type: :string },
              address: { type: :string },
              saas_plan: { type: :string },
              school_group_id: { type: :integer },
              onboarding_mode: { type: :string, enum: %w[self_serve white_glove] },
              owner_email: {
                type: :string,
                format: :email,
                description: "Required for backoffice provisioning; omit when a school admin opens their own school."
              }
            },
            required: %w[name],
            example: {
              name: "White Glove Modules School",
              cnpj: "98.765.432/0001-11",
              onboarding_mode: "white_glove",
              owner_email: "owner@whiteglove.example"
            }
          },
          modules: {
            type: :object,
            description: "Optional partial overrides for MVP module flags; omitted keys keep defaults (all enabled).",
            properties: {
              communication: { type: :boolean },
              academic: { type: :boolean },
              billing: { type: :boolean },
              documents: { type: :boolean }
            },
            example: { billing: false, communication: true }
          }
        },
        required: %w[school],
        example: {
          school: {
            name: "White Glove Modules School",
            onboarding_mode: "white_glove",
            owner_email: "owner@whiteglove.example"
          }
        }
      }

      response "201", "school admin opens a school without owner_email and becomes its administrator" do
        let(:Authorization) { auth_headers_for(school_admin_user)["Authorization"] }
        let(:payload) { { school: { name: "Second Campus" } } }

        run_test! do |response|
          created = School.kept.find_by(name: "Second Campus")
          expect(created).to be_present

          # Without the founding membership the creator could not see what they just created:
          # SchoolPolicy scopes the register by membership.
          expect(
            school_admin_user.memberships.kept.exists?(school: created, role: "staff")
          ).to be(true)
        end
      end

      response "201", "backoffice self-serve school created with onboarding_status pending_handoff" do
        let(:Authorization) { auth_headers_for(backoffice_user)["Authorization"] }
        let(:payload) do
          {
            school: {
              name: "New Tenant School",
              cnpj: "12.345.678/0001-99",
              address: "123 Main St",
              owner_email: "admin@newtenant.example",
              onboarding_mode: "self_serve"
            }
          }
        end

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.dig("data", "name")).to eq("New Tenant School")
          expect(body.dig("data", "onboarding_status")).to eq("pending_handoff")

          school = School.kept.find_by(name: "New Tenant School")
          expect(school).to be_present

          templates = school.school_role_templates.system_templates
          expect(templates.count).to eq(4)

          director = school.system_role_template("director")
          expect(director).to be_present

          billing_permission = director.role_template_permissions.kept.find_by(permission_key: "manage_billing")
          expect(billing_permission).to have_attributes(scope_kind: "full")

          expect(school.school_modules.pluck(:module_key, :enabled)).to contain_exactly(
            [ "communication", true ],
            [ "academic", true ],
            [ "billing", true ],
            [ "documents", true ]
          )
        end
      end

      response "201", "white-glove school accepts module overrides" do
        let(:Authorization) { auth_headers_for(backoffice_user)["Authorization"] }
        let(:payload) do
          {
            school: {
              name: "White Glove Partial Modules School",
              onboarding_mode: "white_glove",
              owner_email: "owner@partial.example"
            },
            modules: {
              billing: false,
              communication: true
            }
          }
        end

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.dig("data", "onboarding_status")).to eq("provisioning")

          school = School.kept.find_by(name: "White Glove Partial Modules School")
          by_key = school.school_modules.index_by(&:module_key)
          expect(by_key.fetch("billing").enabled).to be(false)
          expect(by_key.fetch("communication").enabled).to be(true)
          expect(by_key.fetch("academic").enabled).to be(true)
          expect(by_key.fetch("documents").enabled).to be(true)
        end
      end

      response "201", "backoffice white-glove school created with onboarding_status provisioning" do
        schema SCHOOL_CREATE_RESPONSE_SCHEMA

        let(:Authorization) { auth_headers_for(backoffice_user)["Authorization"] }
        let(:payload) do
          {
            school: {
              name: "White Glove Modules School",
              cnpj: "98.765.432/0001-11",
              onboarding_mode: "white_glove",
              owner_email: "owner@whiteglove.example"
            }
          }
        end

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.dig("data", "onboarding_status")).to eq("provisioning")

          school = School.kept.find_by(name: "White Glove Modules School")
          expect(school.school_modules.pluck(:module_key, :enabled)).to contain_exactly(
            [ "communication", true ],
            [ "academic", true ],
            [ "billing", true ],
            [ "documents", true ]
          )
        end
      end
    end
  end

  path "/api/v1/schools/{id}" do
    parameter name: :id, in: :path, type: :string

    get "Show school" do
      tags "Backoffice"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string
      parameter name: :include, in: :query, type: :string, required: false,
                description: "Backoffice embeds: modules, active_school_year, aggregate_counts"

      response "200", "backoffice detail with embeds" do
        let(:backoffice_ops_user) { create(:user) }
        let!(:backoffice_ops_membership) do
          create(:membership, :with_manage_backoffice_ops, user: backoffice_ops_user)
        end
        let(:Authorization) { auth_headers_for(backoffice_ops_user)["Authorization"] }
        let(:target_school) { create(:school, name: "Detail School") }
        let(:id) { target_school.id }
        let(:include) { "modules,active_school_year,aggregate_counts" }

        before do
          Schools::SeedSchoolModulesService.call(
            school: target_school,
            overrides: { billing: false }
          )
          create(:school_year, :active, school: target_school, name: "2026")
          create(:student, school: target_school, status: "active")
          create(:guardian, school: target_school)
          create(:membership, :staff, user: create(:user), school: target_school, status: "active")
        end

        run_test! do |response|
          body = JSON.parse(response.body).fetch("data")
          expect(body["name"]).to eq("Detail School")
          expect(body.dig("modules", "billing")).to be(false)
          expect(body.dig("active_school_year", "name")).to eq("2026")
          expect(body.dig("aggregate_counts", "student_count")).to eq(1)
          expect(body.dig("aggregate_counts", "guardian_count")).to eq(1)
          expect(body.dig("aggregate_counts", "staff_count")).to eq(1)
          expect(body).not_to have_key("students")
          expect(body).not_to have_key("guardians")
        end
      end

      response "200", "school admin show without backoffice embeds" do
        let(:Authorization) { auth_headers_for(school_admin_user)["Authorization"] }
        let(:id) { school.id }
        let(:include) { "modules,aggregate_counts" }

        run_test! do |response|
          body = JSON.parse(response.body).fetch("data")
          expect(body["name"]).to eq(school.name)
          expect(body).not_to have_key("modules")
          expect(body).not_to have_key("aggregate_counts")
        end
      end
    end

    delete "Soft delete school" do
      tags "Backoffice"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string

      response "204", "school discarded" do
        let(:Authorization) { auth_headers_for(backoffice_user)["Authorization"] }
        let(:target_school) { create(:school, name: "Discard Me") }
        let(:id) { target_school.id }

        run_test! do
          expect(School.kept).not_to include(target_school.reload)
          expect(target_school.discarded_by).to eq(backoffice_user)
        end
      end
    end

    post "Restore discarded school" do
      tags "Backoffice"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string

      response "200", "discarded school restored" do
        let(:backoffice_ops_user) { create(:user) }
        let!(:backoffice_ops_membership) do
          create(:membership, :with_manage_backoffice_ops, user: backoffice_ops_user)
        end
        let(:Authorization) { auth_headers_for(backoffice_ops_user)["Authorization"] }
        let(:target_school) { create(:school, name: "Restore Me").tap(&:discard!) }
        let(:id) { target_school.id }

        run_test! do |response|
          body = JSON.parse(response.body).fetch("data")
          expect(body.fetch("name")).to eq("Restore Me")
          expect(School.kept).to include(target_school.reload)
          expect(target_school.discarded_at).to be_nil
        end
      end

      response "409", "active school cannot be restored" do
        let(:backoffice_ops_user) { create(:user) }
        let!(:backoffice_ops_membership) do
          create(:membership, :with_manage_backoffice_ops, user: backoffice_ops_user)
        end
        let(:Authorization) { auth_headers_for(backoffice_ops_user)["Authorization"] }
        let(:target_school) { create(:school, name: "Still Active") }
        let(:id) { target_school.id }

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "code")).to eq("not_discarded")
        end
      end
    end
  end
end
