# frozen_string_literal: true

require "swagger_helper"

RSpec.describe "Api::V1::Platform::SchoolGroups", type: :request do
  let(:operator) { create(:user) }
  let!(:operator_membership) { create(:membership, :with_manage_multi_unit, user: operator) }
  let(:staff_user) { create(:user) }
  let(:school) { create(:school, school_group: nil) }
  let!(:staff_membership) { create(:membership, :staff, user: staff_user, school: school) }

  path "/api/v1/platform/school_groups" do
    get "List school groups" do
      tags "Backoffice", "Platform School Groups"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string

      response "200", "operator lists school groups" do
        let(:Authorization) { auth_headers_for(operator)["Authorization"] }
        let!(:group) { create(:school_group, name: "Rede ABC") }

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.fetch("data").map { |row| row["name"] }).to include("Rede ABC")
          expect(body.fetch("meta")).to include("total")
        end
      end

      response "403", "staff without permission" do
        let(:Authorization) { auth_headers_for(staff_user)["Authorization"] }

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "code")).to eq("backoffice_only")
        end
      end
    end

    post "Create school group" do
      tags "Backoffice", "Platform School Groups"
      consumes "application/json"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string
      parameter name: :school_group, in: :body, schema: {
        type: :object,
        properties: {
          school_group: {
            type: :object,
            properties: {
              name: { type: :string },
              headquarters_cnpj: { type: :string }
            },
            required: %w[name]
          }
        }
      }

      response "201", "group created" do
        let(:Authorization) { auth_headers_for(operator)["Authorization"] }
        let(:school_group) { { school_group: { name: "Rede Nova", headquarters_cnpj: "00.000.000/0001-91" } } }

        run_test! do |response|
          data = JSON.parse(response.body).fetch("data")
          expect(data.fetch("name")).to eq("Rede Nova")
        end
      end

      response "422", "missing name" do
        let(:Authorization) { auth_headers_for(operator)["Authorization"] }
        let(:school_group) { { school_group: { name: "" } } }

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "code")).to eq("validation_error")
        end
      end
    end
  end

  path "/api/v1/platform/school_groups/{id}" do
    parameter name: :id, in: :path, type: :integer

    get "Show school group" do
      tags "Backoffice", "Platform School Groups"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string

      response "200", "group found" do
        let(:Authorization) { auth_headers_for(operator)["Authorization"] }
        let(:record) { create(:school_group) }
        let(:id) { record.id }

        run_test!
      end

      response "404", "unknown group" do
        let(:Authorization) { auth_headers_for(operator)["Authorization"] }
        let(:id) { 0 }

        run_test!
      end
    end

    patch "Update school group" do
      tags "Backoffice", "Platform School Groups"
      consumes "application/json"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string
      parameter name: :school_group, in: :body, schema: {
        type: :object,
        properties: {
          school_group: {
            type: :object,
            properties: { name: { type: :string } }
          }
        }
      }

      response "200", "group updated" do
        let(:Authorization) { auth_headers_for(operator)["Authorization"] }
        let(:record) { create(:school_group, name: "Old Name") }
        let(:id) { record.id }
        let(:school_group) { { school_group: { name: "New Name" } } }

        run_test! do |response|
          expect(JSON.parse(response.body).dig("data", "name")).to eq("New Name")
        end
      end
    end

    delete "Discard school group" do
      tags "Backoffice", "Platform School Groups"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string

      response "204", "empty group discarded" do
        let(:Authorization) { auth_headers_for(operator)["Authorization"] }
        let(:record) { create(:school_group) }
        let(:id) { record.id }

        run_test!
      end

      response "409", "group has schools" do
        let(:Authorization) { auth_headers_for(operator)["Authorization"] }
        let(:record) { create(:school_group) }
        let(:id) { record.id }

        before { create(:school, school_group: record) }

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "code")).to eq("group_has_schools")
        end
      end
    end
  end

  path "/api/v1/platform/school_groups/{id}/schools" do
    parameter name: :id, in: :path, type: :integer

    get "List schools in group" do
      tags "Backoffice", "Platform School Groups"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string

      response "200", "member schools listed" do
        let(:Authorization) { auth_headers_for(operator)["Authorization"] }
        let(:record) { create(:school_group) }
        let(:id) { record.id }
        let!(:member) { create(:school, school_group: record, name: "Campus A") }

        run_test! do |response|
          names = JSON.parse(response.body).fetch("data").map { |row| row["name"] }
          expect(names).to eq([ "Campus A" ])
        end
      end
    end
  end

  path "/api/v1/platform/school_groups/{id}/assign_school" do
    parameter name: :id, in: :path, type: :integer

    post "Assign school to group" do
      tags "Backoffice", "Platform School Groups"
      consumes "application/json"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string
      parameter name: :payload, in: :body, schema: {
        type: :object,
        properties: { school_id: { type: :integer } },
        required: %w[school_id]
      }

      response "200", "school assigned" do
        let(:Authorization) { auth_headers_for(operator)["Authorization"] }
        let(:record) { create(:school_group) }
        let(:id) { record.id }
        let(:payload) { { school_id: school.id } }

        run_test! do |response|
          expect(JSON.parse(response.body).dig("data", "name")).to eq(school.name)
          expect(school.reload.school_group_id).to eq(record.id)
        end
      end

      response "409", "school already in another group" do
        let(:Authorization) { auth_headers_for(operator)["Authorization"] }
        let(:other_group) { create(:school_group) }
        let(:record) { create(:school_group) }
        let(:id) { record.id }
        let(:payload) { { school_id: school.id } }

        before { school.update!(school_group: other_group) }

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "code")).to eq("school_already_in_group")
        end
      end

      response "404", "unknown school" do
        let(:Authorization) { auth_headers_for(operator)["Authorization"] }
        let(:record) { create(:school_group) }
        let(:id) { record.id }
        let(:payload) { { school_id: 0 } }

        run_test!
      end
    end
  end

  path "/api/v1/platform/school_groups/{id}/schools/{school_id}" do
    parameter name: :id, in: :path, type: :integer
    parameter name: :school_id, in: :path, type: :integer

    delete "Unassign school from group" do
      tags "Backoffice", "Platform School Groups"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string

      response "204", "school unassigned" do
        let(:Authorization) { auth_headers_for(operator)["Authorization"] }
        let(:record) { create(:school_group) }
        let(:id) { record.id }
        let(:school_id) { school.id }

        before { school.update!(school_group: record) }

        run_test! do
          expect(school.reload.school_group_id).to be_nil
        end
      end
    end
  end
end
