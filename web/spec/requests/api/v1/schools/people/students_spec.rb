# frozen_string_literal: true

require "swagger_helper"

RSpec.describe "Api::V1::Schools::People::Students", type: :request do
  let(:school) { create(:school) }
  let(:other_school) { create(:school) }
  let(:school_admin) { create(:user) }
  let!(:school_admin_membership) { create(:membership, :school_admin, user: school_admin, school: school) }
  let(:guardian_user) { create(:user) }
  let!(:guardian_membership) { create(:membership, user: guardian_user, school: school, role: "guardian") }
  let(:school_id) { school.id }
  let(:Authorization) { auth_headers_for(school_admin)["Authorization"] }

  path "/api/v1/schools/{school_id}/people/students" do
    parameter name: :school_id, in: :path, type: :integer

    post "Create student" do
      tags "People"
      consumes "application/json"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string
      parameter name: :payload, in: :body, schema: {
        type: :object,
        properties: {
          student: {
            type: :object,
            properties: {
              name: { type: :string },
              birth_date: { type: :string, format: :date },
              status: { type: :string }
            },
            required: %w[name]
          }
        },
        required: %w[student]
      }

      response "201", "student created in school" do
        let(:payload) do
          {
            student: {
              name: "Pedro Silva",
              birth_date: "2015-03-10"
            }
          }
        end

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.dig("data", "school_id")).to eq(school.id)
          expect(body.dig("data", "name")).to eq("Pedro Silva")
        end
      end

      response "403", "guardian cannot create students" do
        let(:Authorization) { auth_headers_for(guardian_user)["Authorization"] }
        let(:payload) { { student: { name: "Blocked Student" } } }

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.dig("error", "code")).to eq("forbidden")
        end
      end
    end
  end

  path "/api/v1/schools/{school_id}/people/students/{id}" do
    parameter name: :school_id, in: :path, type: :integer
    parameter name: :id, in: :path, type: :integer

    get "Show student" do
      tags "People"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string

      response "200", "student found in same school" do
        let!(:student) { create(:student, school: school, name: "Pedro Silva") }
        let(:id) { student.id }

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.dig("data", "name")).to eq("Pedro Silva")
        end
      end

      response "404", "cross-school student access denied" do
        let!(:other_student) { create(:student, school: other_school, name: "Other School Student") }
        let(:school_id) { school.id }
        let(:id) { other_student.id }

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.dig("error", "code")).to eq("not_found")
        end
      end
    end
  end
end
