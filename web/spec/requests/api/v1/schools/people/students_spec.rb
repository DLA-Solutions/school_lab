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
  let(:school_class) { create(:school_class, school: school, grade_level: "fundamental_i_5") }
  let(:guardian) { create(:guardian, school: school) }
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
              cpf: { type: :string, description: "Accepted formatted or bare; stored as 11 digits and unique per school" },
              rg: { type: :string, description: "Optional" },
              birth_date: { type: :string, format: :date },
              school_class_id: { type: :integer },
              father_cpf: { type: :string, description: "CPF of an already registered guardian" },
              mother_cpf: { type: :string, description: "CPF of an already registered guardian" },
              status: { type: :string }
            },
            required: %w[name cpf birth_date school_class_id]
          }
        },
        required: %w[student]
      }

      response "201", "student created in school" do
        let(:payload) do
          {
            student: {
              name: "Pedro Silva",
              cpf: "529.982.247-25",
              rg: "MG-14.235.789",
              birth_date: "2015-03-10",
              school_class_id: school_class.id,
              mother_cpf: guardian.cpf
            }
          }
        end

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.dig("data", "school_id")).to eq(school.id)
          expect(body.dig("data", "name")).to eq("Pedro Silva")
          expect(body.dig("data", "cpf")).to eq("52998224725")
          # The grade is read from the cohort the student was enrolled into.
          expect(body.dig("data", "grade_level")).to eq("fundamental_i_5")
          expect(body.dig("data", "guardians").map { |g| g["relationship"] }).to eq([ "mother" ])
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

# BR-IN11/UC-IN06 — when staff only knows a parent's name, searching guardians by name and then
# filtering students by that guardian's id finds the right student without knowing it by name
# first. No new search endpoint: this combines the two existing filters (GuardiansController's
# `q`, StudentsController's `guardian_id`).
RSpec.describe "Guardian-name search narrows the student picker (BR-IN11/UC-IN06)", type: :request do
  let(:school) { create(:school) }
  let(:school_admin) { create(:user) }
  let!(:school_admin_membership) { create(:membership, :school_admin, user: school_admin, school: school) }
  let(:headers) { auth_headers_for(school_admin) }

  it "resolves a guardian by name, then narrows the student list to that guardian's children" do
    mother = create(:guardian, school: school, name: "Marcela Silva")
    pedro = create(:student, school: school, name: "Pedro Silva")
    create(:student_guardian, school: school, student: pedro, guardian: mother, relationship: "mother")
    create(:student, school: school, name: "Outro Aluno")

    get "/api/v1/schools/#{school.id}/people/guardians", params: { q: "Marcela" }, headers: headers
    expect(response.parsed_body["data"].map { |row| row["name"] }).to eq([ "Marcela Silva" ])
    guardian_id = response.parsed_body["data"].first["id"]

    get "/api/v1/schools/#{school.id}/people/students", params: { guardian_id: guardian_id }, headers: headers

    names = response.parsed_body["data"].map { |row| row["name"] }
    expect(names).to eq([ "Pedro Silva" ])
  end
end
