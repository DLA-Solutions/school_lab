# frozen_string_literal: true

require "swagger_helper"

RSpec.describe "Api::V1::Schools::People::Guardians", type: :request do
  let(:school) { create(:school) }
  let(:other_school) { create(:school) }
  let(:school_admin) { create(:user) }
  let!(:school_admin_membership) { create(:membership, :school_admin, user: school_admin, school: school) }
  let(:guardian_user) { create(:user) }
  let!(:guardian_membership) { create(:membership, user: guardian_user, school: school, role: "guardian") }
  let(:school_id) { school.id }
  let(:Authorization) { auth_headers_for(school_admin)["Authorization"] }

  path "/api/v1/schools/{school_id}/people/guardians" do
    parameter name: :school_id, in: :path, type: :integer

    get "List guardians" do
      tags "People"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string

      response "200", "guardians listed" do
        let!(:guardian) { create(:guardian, school: school, name: "Maria Silva") }

        run_test! do |response|
          body = JSON.parse(response.body)
          names = body.fetch("data").map { |row| row["name"] }
          expect(names).to include("Maria Silva")
        end
      end
    end

    post "Create guardian" do
      tags "People"
      consumes "application/json"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string
      parameter name: :payload, in: :body, schema: {
        type: :object,
        properties: {
          guardian: {
            type: :object,
            properties: {
              name: { type: :string },
              email: { type: :string },
              cpf: { type: :string, description: "Accepted formatted or bare; stored as 11 digits and unique per school" },
              phone: { type: :string },
              zip_code: { type: :string },
              street: { type: :string },
              number: { type: :string },
              complement: { type: :string },
              neighborhood: { type: :string },
              city: { type: :string },
              state: { type: :string, description: "Two-letter UF" }
            },
            required: %w[name cpf email phone]
          }
        },
        required: %w[guardian]
      }

      response "201", "guardian created in school" do
        let(:payload) do
          {
            guardian: {
              name: "Maria Silva",
              email: "maria@example.com",
              cpf: "123.456.789-09",
              phone: "+55 11 99999-0000",
              zip_code: "01310-100",
              street: "Avenida Paulista",
              number: "1000",
              neighborhood: "Bela Vista",
              city: "São Paulo",
              state: "sp"
            }
          }
        end

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.dig("data", "school_id")).to eq(school.id)
          expect(body.dig("data", "name")).to eq("Maria Silva")

          # Stored canonically: CPF and CEP as bare digits, UF upcased.
          expect(body.dig("data", "cpf")).to eq("12345678909")
          expect(body.dig("data", "zip_code")).to eq("01310100")
          expect(body.dig("data", "state")).to eq("SP")

          expect(Guardian.kept.find_by(name: "Maria Silva", school: school)).to be_present
        end
      end

      response "403", "forbidden for guardian role" do
        let(:Authorization) { auth_headers_for(guardian_user)["Authorization"] }
        let(:payload) { { guardian: { name: "Blocked" } } }

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.dig("error", "code")).to eq("forbidden")
        end
      end
    end
  end

  path "/api/v1/schools/{school_id}/people/guardians/{id}" do
    parameter name: :school_id, in: :path, type: :integer
    parameter name: :id, in: :path, type: :integer

    patch "Update guardian" do
      tags "People"
      consumes "application/json"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string
      parameter name: :payload, in: :body, schema: {
        type: :object,
        properties: {
          guardian: {
            type: :object,
            properties: {
              name: { type: :string }
            }
          }
        },
        required: %w[guardian]
      }

      response "200", "guardian updated and audited" do
        let!(:guardian) { create(:guardian, school: school, name: "Before") }
        let(:id) { guardian.id }
        let(:payload) { { guardian: { name: "After" } } }

        run_test! do
          expect(guardian.reload.name).to eq("After")
          audit = Audited::Audit.find_by(auditable: guardian, action: "update")
          expect(audit).to be_present
          expect(audit.associated_id).to eq(school.id)
          expect(audit.associated_type).to eq("School")
        end
      end
    end
  end
end

RSpec.describe "Suspended membership blocks school access", type: :request do
  let(:school) { create(:school) }
  let(:user) { create(:user) }
  let!(:membership) { create(:membership, :suspended, user: user, school: school, role: "school") }
  let(:headers) { auth_headers_for(user) }

  it "returns 403 for people endpoints" do
    get "/api/v1/schools/#{school.id}/people/guardians", headers: headers

    expect(response).to have_http_status(:forbidden)
    expect(json.dig("error", "code")).to eq("membership_suspended")
  end
end
