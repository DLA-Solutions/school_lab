# frozen_string_literal: true

require "swagger_helper"

RSpec.describe "Api::V1::Me", type: :request do
  let(:school1) { create(:school, name: "School One") }
  let(:school2) { create(:school, name: "School Two") }
  let(:user) { create(:user) }
  let!(:membership1) { create(:membership, user: user, school: school1, role: "guardian", status: "active") }
  let!(:membership2) { create(:membership, user: user, school: school2, role: "school", status: "active") }
  let(:Authorization) { auth_headers_for(user)["Authorization"] }

  path "/api/v1/me" do
    get "Current user profile" do
      tags "Me"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string

      response "200", "memberships returned" do
        run_test! do |response|
          body = JSON.parse(response.body)
          memberships = body.dig("data", "memberships")
          expect(memberships.size).to eq(2)
          school_ids = memberships.map { |m| m["school_id"] }
          expect(school_ids).to contain_exactly(school1.id, school2.id)
          memberships.each do |membership|
            expect(membership).to include("role", "status", "school_name")
          end

          guardian_membership = memberships.find { |m| m["school_id"] == school1.id }
          expect(guardian_membership["role_template"]).to be_nil
          expect(guardian_membership["is_owner"]).to be_nil
          expect(guardian_membership["permissions"]).to eq([])
          expect(guardian_membership["permission_sources"]).to eq({})

          legacy_staff_membership = memberships.find { |m| m["school_id"] == school2.id }
          expect(legacy_staff_membership["permissions"]).to eq([])
        end
      end

      response "200", "excludes memberships at discarded schools" do
        let(:active_school) { create(:school, name: "Active School") }
        let(:discarded_school) { create(:school, name: "Discarded School") }
        let(:filtered_user) { create(:user) }
        let!(:active_membership) do
          create(:membership, user: filtered_user, school: active_school, role: "staff", status: "active")
        end
        let!(:discarded_school_membership) do
          create(:membership, user: filtered_user, school: discarded_school, role: "staff", status: "active")
        end
        let!(:backoffice_membership) { create(:membership, :backoffice, user: filtered_user) }
        let(:Authorization) { auth_headers_for(filtered_user)["Authorization"] }

        before { discarded_school.discard! }

        run_test! do |response|
          body = JSON.parse(response.body)
          memberships = body.dig("data", "memberships")
          school_ids = memberships.filter_map { |m| m["school_id"] }

          expect(school_ids).to contain_exactly(active_school.id)
          expect(school_ids).not_to include(discarded_school.id)
          expect(memberships.map { |m| m["role"] }).to include("backoffice")
        end
      end

      response "200", "staff owner membership includes permissions" do
        let(:owner_school) { create(:school, name: "Owner School") }
        let(:owner_user) { create(:user) }
        let!(:owner_membership) { create(:membership, :staff, user: owner_user, school: owner_school) }
        let(:Authorization) { auth_headers_for(owner_user)["Authorization"] }

        before do
          director_template = create_system_templates_for(owner_school).find { |t| t.system_key == "director" }
          create(
            :staff_profile,
            :owner,
            membership: owner_membership,
            school: owner_school,
            role_template: director_template,
            display_title: "Diretor"
          )
        end

        run_test! do |response|
          body = JSON.parse(response.body)
          membership = body.dig("data", "memberships").find { |m| m["school_id"] == owner_school.id }

          expect(membership["role_template"]["system_key"]).to eq("director")
          expect(membership["is_owner"]).to be(true)
          expect(membership["display_title"]).to eq("Diretor")
          expect(membership["permissions"]).to include("manage_billing", "manage_people")
          expect(membership["permission_sources"]["manage_billing"]).to eq("owner")
        end
      end

      response "200", "membership includes enabled_modules for school" do
        let(:modular_school) { create(:school, name: "Modular School") }
        let(:modular_user) { create(:user) }
        let!(:modular_membership) { create(:membership, :staff, user: modular_user, school: modular_school) }
        let(:Authorization) { auth_headers_for(modular_user)["Authorization"] }

        before do
          create(:school_module, school: modular_school, module_key: "communication", enabled: false)
          create(:school_module, school: modular_school, module_key: "billing", enabled: false)
          create(:school_module, school: modular_school, module_key: "academic", enabled: true)
          create(:school_module, school: modular_school, module_key: "documents", enabled: true)
        end

        run_test! do |response|
          body = JSON.parse(response.body)
          membership = body.dig("data", "memberships").find { |m| m["school_id"] == modular_school.id }

          expect(membership["enabled_modules"]).to contain_exactly("academic", "documents")
        end
      end

      response "200", "membership defaults missing module rows to enabled" do
        let(:legacy_school) { create(:school, name: "Legacy School") }
        let(:legacy_user) { create(:user) }
        let!(:legacy_membership) { create(:membership, :staff, user: legacy_user, school: legacy_school) }
        let(:Authorization) { auth_headers_for(legacy_user)["Authorization"] }

        run_test! do |response|
          body = JSON.parse(response.body)
          membership = body.dig("data", "memberships").find { |m| m["school_id"] == legacy_school.id }

          expect(membership["enabled_modules"]).to match_array(SchoolLab::SchoolModuleKeys.keys)
        end
      end

      response "200", "secretary with grant override exposes grant source" do
        let(:secretary_school) { create(:school, name: "Secretary School") }
        let(:secretary_user) { create(:user) }
        let!(:secretary_membership) { create(:membership, :staff, user: secretary_user, school: secretary_school) }
        let(:Authorization) { auth_headers_for(secretary_user)["Authorization"] }

        before do
          secretary_template = create_system_templates_for(secretary_school).find { |t| t.system_key == "secretary" }
          create(
            :staff_profile,
            membership: secretary_membership,
            school: secretary_school,
            role_template: secretary_template
          )
          create(
            :membership_permission,
            membership: secretary_membership,
            school: secretary_school,
            permission_key: "manage_billing",
            effect: "grant"
          )
        end

        run_test! do |response|
          body = JSON.parse(response.body)
          membership = body.dig("data", "memberships").find { |m| m["school_id"] == secretary_school.id }

          expect(membership["permissions"]).to include("manage_billing")
          expect(membership["permission_sources"]["manage_billing"]).to eq("grant")
        end
      end

      response "401", "unauthenticated" do
        let(:Authorization) { nil }

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.dig("error", "code")).to eq("unauthorized")
        end
      end
    end
  end

  path "/api/v1/me/device_tokens" do
    post "Register device token" do
      tags "Me"
      consumes "application/json"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string
      parameter name: :payload, in: :body, schema: {
        type: :object,
        properties: {
          device_token: {
            type: :object,
            properties: {
              token: { type: :string },
              platform: { type: :string, enum: %w[ios android web] }
            },
            required: %w[token platform]
          }
        },
        required: %w[device_token]
      }

      response "201", "device token registered" do
        let(:payload) { { device_token: { token: "fcm-abc-123", platform: "android" } } }

        run_test! do |response|
          expect(DeviceToken.kept.find_by(user: user, token: "fcm-abc-123")).to be_present
          body = JSON.parse(response.body)
          expect(body.dig("data", "token")).to eq("fcm-abc-123")
        end
      end
    end
  end
end
