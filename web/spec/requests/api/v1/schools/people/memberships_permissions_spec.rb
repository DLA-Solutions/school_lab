# frozen_string_literal: true

require "swagger_helper"

RSpec.describe "Api::V1::Schools::People::Memberships permissions", type: :request do
  let(:school) { create(:school) }
  let(:other_school) { create(:school) }
  let(:school_id) { school.id }
  let(:owner_user) { create(:user) }
  let!(:owner_membership) { create_owner_membership(school, user: owner_user).last }
  let(:secretary_user) { create(:user) }
  let!(:secretary_membership) { create(:membership, :staff, user: secretary_user, school: school) }
  let(:secretary_template) { create_system_templates_for(school).find { |t| t.system_key == "secretary" } }
  let(:Authorization) { auth_headers_for(owner_user)["Authorization"] }

  before do
    create(:staff_profile, membership: secretary_membership, school: school, role_template: secretary_template)
  end

  path "/api/v1/schools/{school_id}/people/memberships/{id}/permissions" do
    parameter name: :school_id, in: :path, type: :integer
    parameter name: :id, in: :path, type: :integer

    patch "Update membership permission overrides" do
      tags "People"
      consumes "application/json"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string
      parameter name: :payload, in: :body, schema: {
        type: :object,
        properties: {
          grants: { type: :array, items: { type: :string } },
          denies: { type: :array, items: { type: :string } }
        }
      }

      response "200", "owner grants manage_billing to secretary" do
        let(:id) { secretary_membership.id }
        let(:payload) { { grants: [ "manage_billing" ] } }

        run_test! do |response|
          body = JSON.parse(response.body).fetch("data")
          expect(body["permissions"]).to include("manage_billing")
          expect(body.dig("permission_sources", "manage_billing")).to eq("grant")
        end
      end

      response "200", "owner denies manage_enrollment" do
        let(:id) { secretary_membership.id }
        let(:payload) { { denies: [ "manage_enrollment" ] } }

        run_test! do |response|
          body = JSON.parse(response.body).fetch("data")
          expect(body["permissions"]).not_to include("manage_enrollment")
        end
      end

      response "403", "secretary cannot patch overrides" do
        let(:Authorization) { auth_headers_for(secretary_user)["Authorization"] }
        let(:id) { secretary_membership.id }
        let(:payload) { { grants: [ "manage_billing" ] } }

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "code")).to eq("forbidden")
        end
      end

      response "422", "grants and denies overlap" do
        let(:id) { secretary_membership.id }
        let(:payload) { { grants: [ "manage_billing" ], denies: [ "manage_billing" ] } }

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "code")).to eq("validation_error")
        end
      end

      response "422", "teach grant without also_teaches" do
        let(:id) { secretary_membership.id }
        let(:payload) { { grants: [ "teach" ] } }

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "code")).to eq("invalid_permission_for_role")
        end
      end

      response "409", "suspended membership" do
        let(:suspended_user) { create(:user) }
        let!(:suspended_membership) { create(:membership, :staff, :suspended, user: suspended_user, school: school) }
        let(:id) { suspended_membership.id }
        let(:payload) { { grants: [ "manage_billing" ] } }

        before do
          create(:staff_profile, membership: suspended_membership, school: school, role_template: secretary_template)
        end

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "code")).to eq("invalid_state_transition")
        end
      end

      response "404", "cross-school membership id" do
        let(:foreign_membership) { create(:membership, :staff, school: other_school) }
        let(:id) { foreign_membership.id }
        let(:payload) { { grants: [ "manage_billing" ] } }

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "code")).to eq("not_found")
        end
      end
    end
  end
end

RSpec.describe "Membership permission overrides audit", type: :request do
  it "records an audit row when overrides change" do
    school = create(:school)
    owner = create_owner_membership(school).first
    secretary_user = create(:user)
    secretary_membership = create(:membership, :staff, user: secretary_user, school: school)
    secretary_template = create_system_templates_for(school).find { |t| t.system_key == "secretary" }
    create(:staff_profile, membership: secretary_membership, school: school, role_template: secretary_template)

    patch "/api/v1/schools/#{school.id}/people/memberships/#{secretary_membership.id}/permissions",
          params: { grants: [ "manage_billing" ] },
          headers: auth_headers_for(owner),
          as: :json

    expect(response).to have_http_status(:ok)

    override = secretary_membership.membership_permissions.kept.find_by!(permission_key: "manage_billing")
    audit = Audited::Audit.find_by(auditable: override, action: "create")
    expect(audit).to be_present
  end
end

RSpec.describe "Secretary with billing grant can create charge", type: :request do
  it "returns 201 after owner grants manage_billing" do
    school = create(:school)
    owner = create_owner_membership(school).first
    secretary_user = create(:user)
    secretary_membership = create(:membership, :staff, user: secretary_user, school: school)
    secretary_template = create_system_templates_for(school).find { |t| t.system_key == "secretary" }
    create(:staff_profile, membership: secretary_membership, school: school, role_template: secretary_template)
    guardian = create(:guardian, school: school)

    patch "/api/v1/schools/#{school.id}/people/memberships/#{secretary_membership.id}/permissions",
          params: { grants: [ "manage_billing" ] },
          headers: auth_headers_for(owner),
          as: :json
    expect(response).to have_http_status(:ok)

    post "/api/v1/schools/#{school.id}/billing/charges",
         params: {
           charge: {
             guardian_id: guardian.id,
             total_amount_cents: 5_000,
             due_date: "2026-09-15",
             description: "Override billing test"
           }
         },
         headers: auth_headers_for(secretary_user),
         as: :json

    expect(response).to have_http_status(:created)
  end
end
