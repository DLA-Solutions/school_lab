# frozen_string_literal: true

require "swagger_helper"

RSpec.describe "Api::V1::Schools::RoleTemplates", type: :request do
  let(:school) { create(:school) }
  let(:other_school) { create(:school) }
  let(:school_id) { school.id }
  let(:owner_user) { create(:user) }
  let!(:owner_membership) { create_owner_membership(school, user: owner_user).last }
  let(:secretary_user) { create(:user) }
  let!(:secretary_membership) { create(:membership, :staff, user: secretary_user, school: school) }
  let(:secretary_template) { create_system_templates_for(school).find { |t| t.system_key == "secretary" } }
  let(:Authorization) { auth_headers_for(owner_user)["Authorization"] }

  def assign_secretary_profile!
    create(:staff_profile, membership: secretary_membership, school: school, role_template: secretary_template)
  end

  path "/api/v1/schools/{school_id}/role_templates" do
    parameter name: :school_id, in: :path, type: :integer

    get "List role templates" do
      tags "Role Templates"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string

      response "200", "secretary with manage_people can list templates" do
        let(:Authorization) { auth_headers_for(secretary_user)["Authorization"] }

        before { assign_secretary_profile! }

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body["data"]).to be_present
          expect(body["meta"]).to include("page", "per_page", "total")
          template = body["data"].find { |entry| entry["system_key"] == "secretary" }
          expect(template["permissions"]).to be_present
        end
      end
    end

    post "Create role template" do
      tags "Role Templates"
      consumes "application/json"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string
      parameter name: :payload, in: :body, schema: {
        type: :object,
        properties: {
          name: { type: :string },
          permissions: {
            type: :array,
            items: {
              type: :object,
              properties: {
                permission_key: { type: :string },
                scope_kind: { type: :string }
              }
            }
          }
        },
        required: %w[name permissions]
      }

      response "201", "owner creates a custom template" do
        let(:payload) do
          {
            name: "Recepção",
            permissions: [
              { permission_key: "manage_people", scope_kind: "full" }
            ]
          }
        end

        run_test! do |response|
          body = JSON.parse(response.body).fetch("data")
          expect(body["name"]).to eq("Recepção")
          expect(body["is_system"]).to be(false)
          expect(body["permissions"].map { |entry| entry["permission_key"] }).to eq([ "manage_people" ])
        end
      end

      response "403", "non-owner cannot create templates" do
        let(:Authorization) { auth_headers_for(secretary_user)["Authorization"] }

        before { assign_secretary_profile! }

        let(:payload) do
          {
            name: "Recepção",
            permissions: [
              { permission_key: "manage_people", scope_kind: "full" }
            ]
          }
        end

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.dig("error", "code")).to eq("forbidden")
        end
      end
    end
  end

  path "/api/v1/schools/{school_id}/role_templates/{id}" do
    parameter name: :school_id, in: :path, type: :integer
    parameter name: :id, in: :path, type: :integer

    patch "Update role template" do
      tags "Role Templates"
      consumes "application/json"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string
      parameter name: :payload, in: :body, schema: {
        type: :object,
        properties: {
          name: { type: :string },
          permissions: {
            type: :array,
            items: {
              type: :object,
              properties: {
                permission_key: { type: :string },
                scope_kind: { type: :string }
              }
            }
          }
        }
      }

      response "200", "owner updates secretary template and reports affected memberships" do
        let(:staff_user_one) { create(:user) }
        let(:staff_user_two) { create(:user) }

        before do
          [ staff_user_one, staff_user_two ].each do |user|
            membership = create(:membership, :staff, user: user, school: school)
            create(:staff_profile, membership: membership, school: school, role_template: secretary_template)
          end
        end

        let(:id) { secretary_template.id }
        let(:payload) do
          {
            permissions: [
              { permission_key: "manage_people", scope_kind: "full" },
              { permission_key: "manage_documents", scope_kind: "full" }
            ]
          }
        end

        run_test! do |response|
          body = JSON.parse(response.body).fetch("data")
          expect(body["affected_memberships_count"]).to eq(2)
          keys = body["permissions"].map { |entry| entry["permission_key"] }
          expect(keys).to contain_exactly("manage_people", "manage_documents")
          expect(keys).not_to include("manage_enrollment")

          get "/api/v1/me", headers: auth_headers_for(staff_user_one)
          me_body = JSON.parse(response.body)
          membership = me_body.dig("data", "memberships").find { |entry| entry["school_id"] == school.id }
          expect(membership["permissions"]).not_to include("manage_enrollment")
        end
      end

      response "404", "cross-school update returns not found" do
        let(:school_id) { other_school.id }
        let(:id) { secretary_template.id }
        let(:payload) { { name: "Outro nome" } }

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.dig("error", "code")).to eq("not_found")
        end
      end

      response "422", "cannot strip admin permissions from the last admin-capable template" do
        let(:director_template) { create_system_templates_for(school).find { |t| t.system_key == "director" } }
        let(:id) { director_template.id }
        let(:payload) do
          {
            permissions: [
              { permission_key: "manage_billing", scope_kind: "full" }
            ]
          }
        end

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.dig("error", "code")).to eq("last_admin_template")
        end
      end
    end

    delete "Delete role template" do
      tags "Role Templates"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string

      response "422", "cannot delete system director template" do
        let(:director_template) { create_system_templates_for(school).find { |t| t.system_key == "director" } }
        let(:id) { director_template.id }

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.dig("error", "code")).to eq("cannot_delete_system_template")
        end
      end

      response "422", "cannot delete custom template in use" do
        let(:custom_template) { create(:school_role_template, school: school, name: "Em uso") }
        let(:id) { custom_template.id }

        before do
          membership = create(:membership, :staff, school: school)
          create(:staff_profile, membership: membership, school: school, role_template: custom_template)
        end

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.dig("error", "code")).to eq("template_in_use")
        end
      end

      response "404", "cross-school delete returns not found" do
        let(:custom_template) { create(:school_role_template, school: school) }
        let(:school_id) { other_school.id }
        let(:id) { custom_template.id }

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.dig("error", "code")).to eq("not_found")
        end
      end

      response "204", "owner deletes unused custom template" do
        let(:custom_template) { create(:school_role_template, school: school, name: "Descartável") }
        let(:id) { custom_template.id }

        run_test! do
          expect(custom_template.reload).to be_discarded
        end
      end
    end
  end

  path "/api/v1/schools/{school_id}/role_templates/{id}/clone" do
    parameter name: :school_id, in: :path, type: :integer
    parameter name: :id, in: :path, type: :integer

    post "Clone role template" do
      tags "Role Templates"
      consumes "application/json"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string
      parameter name: :payload, in: :body, schema: {
        type: :object,
        properties: {
          name: { type: :string }
        },
        required: %w[name]
      }

      response "201", "owner clones a system template into a custom copy" do
        let(:id) { secretary_template.id }
        let(:payload) { { name: "Secretaria Cópia" } }

        run_test! do |response|
          body = JSON.parse(response.body).fetch("data")
          expect(body["name"]).to eq("Secretaria Cópia")
          expect(body["is_system"]).to be(false)
          expect(body["permissions"].map { |entry| entry["permission_key"] })
            .to match_array(secretary_template.role_template_permissions.kept.pluck(:permission_key))
        end
      end
    end
  end
end
