# frozen_string_literal: true

require "swagger_helper"

RSpec.describe "Api::V1::Schools", type: :request do
  let(:backoffice_user) { create(:user) }
  let!(:backoffice_membership) { create(:membership, :backoffice, user: backoffice_user) }
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
              school_group_id: { type: :integer }
            },
            required: %w[name]
          }
        },
        required: %w[school]
      }

      response "201", "school created" do
        let(:Authorization) { auth_headers_for(backoffice_user)["Authorization"] }
        let(:payload) do
          {
            school: {
              name: "New Tenant School",
              cnpj: "12.345.678/0001-99",
              address: "123 Main St"
            }
          }
        end

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.dig("data", "name")).to eq("New Tenant School")

          school = School.kept.find_by(name: "New Tenant School")
          expect(school).to be_present

          templates = school.school_role_templates.system_templates
          expect(templates.count).to eq(4)

          director = school.system_role_template("director")
          expect(director).to be_present

          billing_permission = director.role_template_permissions.kept.find_by(permission_key: "manage_billing")
          expect(billing_permission).to have_attributes(scope_kind: "full")
        end
      end

      response "201", "school admin opens a school and becomes its administrator" do
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
    end
  end

  path "/api/v1/schools/{id}" do
    parameter name: :id, in: :path, type: :string

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
  end
end
