# frozen_string_literal: true

require "swagger_helper"

RSpec.describe "Api::V1::Schools::CrmContacts", type: :request do
  let(:school) { create(:school) }
  let(:other_school) { create(:school) }
  let(:school_id) { school.id }
  let(:owner_user) { create(:user) }
  let!(:owner_membership) { create_owner_membership(school, user: owner_user).last }
  let(:teacher_user) { create(:user) }
  let!(:teacher_membership) { create(:membership, :staff, user: teacher_user, school: school) }
  let(:guardian_user) { create(:user) }
  let!(:guardian_membership) { create(:membership, user: guardian_user, school: school, role: "guardian") }
  let(:Authorization) { auth_headers_for(owner_user)["Authorization"] }

  def make_teacher!
    template = create_system_templates_for(school).find { |t| t.system_key == "teacher" }
    create(:staff_profile, membership: teacher_membership, school: school, role_template: template)
  end

  contact_schema = {
    type: :object,
    properties: {
      name: { type: :string },
      phone: { type: :string, nullable: true },
      email: { type: :string, nullable: true },
      notes: { type: :string, nullable: true },
      temperature: { type: :string, enum: %w[cold warm hot] }
    }
  }

  path "/api/v1/schools/{school_id}/crm_contacts" do
    parameter name: :school_id, in: :path, type: :integer

    get "List CRM contacts" do
      tags "CRM"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string
      parameter name: :temperature, in: :query, type: :string, required: false,
                description: "cold | warm | hot"
      parameter name: :q, in: :query, type: :string, required: false,
                description: "Case-insensitive match on name, email or phone"
      parameter name: :page, in: :query, type: :integer, required: false

      response "401", "unauthenticated" do
        let(:Authorization) { nil }

        run_test!
      end

      response "403", "forbidden for a teacher" do
        let(:Authorization) { auth_headers_for(teacher_user)["Authorization"] }

        before { make_teacher! }

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "code")).to eq("forbidden")
        end
      end

      response "403", "forbidden for a guardian" do
        let(:Authorization) { auth_headers_for(guardian_user)["Authorization"] }

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "code")).to eq("forbidden")
        end
      end

      response "404", "school the user does not belong to" do
        let(:school_id) { other_school.id }

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "code")).to eq("not_found")
        end
      end

      response "200", "lists only this school's kept contacts, with pagination meta" do
        let!(:zoe) { create(:crm_contact, school: school, name: "Zoe", temperature: "hot") }
        let!(:ana) { create(:crm_contact, school: school, name: "Ana", temperature: "cold") }

        before do
          create(:crm_contact, :discarded, school: school, name: "Removed")
          create(:crm_contact, school: other_school, name: "Foreign")
        end

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body["data"].pluck("name")).to eq(%w[Ana Zoe])
          expect(body["data"].first.keys).to contain_exactly(
            "id", "name", "phone", "email", "notes", "temperature"
          )
          expect(body["meta"]).to include("page" => 1, "total" => 2)
        end
      end

      response "200", "filters by temperature" do
        let(:temperature) { "hot" }
        let!(:hot) { create(:crm_contact, :hot, school: school) }

        before { create(:crm_contact, school: school) }

        run_test! do |response|
          expect(JSON.parse(response.body)["data"].pluck("id")).to eq([ hot.id ])
        end
      end

      response "200", "searches by name, email or phone" do
        let(:q) { "joana" }
        let!(:joana) { create(:crm_contact, school: school, name: "Joana Prado") }

        before { create(:crm_contact, school: school, name: "Carlos") }

        run_test! do |response|
          expect(JSON.parse(response.body)["data"].pluck("id")).to eq([ joana.id ])
        end
      end

      response "422", "unknown temperature filter" do
        let(:temperature) { "boiling" }

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.dig("error", "code")).to eq("validation_error")
          expect(body.dig("error", "details")).to have_key("temperature")
        end
      end
    end

    post "Create a CRM contact" do
      tags "CRM"
      consumes "application/json"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string
      parameter name: :payload, in: :body, schema: {
        type: :object,
        properties: { crm_contact: contact_schema },
        required: %w[crm_contact]
      }

      response "201", "creates a contact in the current school, cold by default" do
        let(:payload) { { crm_contact: { name: "Maria Souza", phone: "11 98888-7777", email: "Maria@Example.com" } } }

        run_test! do |response|
          data = JSON.parse(response.body).fetch("data")
          expect(data).to include("name" => "Maria Souza", "email" => "maria@example.com",
                                  "temperature" => "cold", "school_id" => school.id)
          expect(CrmContact.find(data["id"]).school_id).to eq(school.id)
        end
      end

      response "422", "name is required" do
        let(:payload) { { crm_contact: { name: "", temperature: "warm" } } }

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.dig("error", "code")).to eq("validation_error")
          expect(body.dig("error", "details")).to have_key("name")
        end
      end

      response "422", "temperature must be cold, warm or hot" do
        let(:payload) { { crm_contact: { name: "Maria", temperature: "boiling" } } }

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "details")).to have_key("temperature")
        end
      end

      response "403", "forbidden for a teacher" do
        let(:Authorization) { auth_headers_for(teacher_user)["Authorization"] }
        let(:payload) { { crm_contact: { name: "Maria" } } }

        before { make_teacher! }

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "code")).to eq("forbidden")
          expect(CrmContact.count).to eq(0)
        end
      end

      response "401", "unauthenticated" do
        let(:Authorization) { nil }
        let(:payload) { { crm_contact: { name: "Maria" } } }

        run_test!
      end
    end
  end

  path "/api/v1/schools/{school_id}/crm_contacts/{id}" do
    parameter name: :school_id, in: :path, type: :integer
    parameter name: :id, in: :path, type: :integer

    let(:contact) { create(:crm_contact, school: school, name: "Original") }
    let(:id) { contact.id }

    get "Show a CRM contact" do
      tags "CRM"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string

      response "200", "returns the detail view" do
        run_test! do |response|
          expect(JSON.parse(response.body).fetch("data").keys).to contain_exactly(
            "id", "name", "phone", "email", "notes", "temperature", "school_id", "created_at", "updated_at"
          )
        end
      end

      response "401", "unauthenticated" do
        let(:Authorization) { nil }

        run_test!
      end

      response "403", "forbidden for a teacher" do
        let(:Authorization) { auth_headers_for(teacher_user)["Authorization"] }

        before { make_teacher! }

        run_test!
      end

      response "404", "contact of another school" do
        let(:contact) { create(:crm_contact, school: other_school) }

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "code")).to eq("not_found")
        end
      end

      response "404", "discarded contact" do
        let(:contact) { create(:crm_contact, :discarded, school: school) }

        run_test!
      end
    end

    patch "Update a CRM contact" do
      tags "CRM"
      consumes "application/json"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string
      parameter name: :payload, in: :body, schema: {
        type: :object,
        properties: { crm_contact: contact_schema },
        required: %w[crm_contact]
      }

      response "200", "updates fields and reclassifies the lead" do
        let(:payload) { { crm_contact: { name: "Renamed", temperature: "hot" } } }

        run_test! do
          expect(contact.reload).to have_attributes(name: "Renamed", temperature: "hot")
        end
      end

      response "422", "invalid temperature" do
        let(:payload) { { crm_contact: { temperature: "boiling" } } }

        run_test! do
          expect(contact.reload.temperature).to eq("cold")
        end
      end

      response "403", "forbidden for a teacher" do
        let(:Authorization) { auth_headers_for(teacher_user)["Authorization"] }
        let(:payload) { { crm_contact: { name: "Hacked" } } }

        before { make_teacher! }

        run_test! do
          expect(contact.reload.name).to eq("Original")
        end
      end

      response "404", "contact of another school" do
        let(:contact) { create(:crm_contact, school: other_school, name: "Foreign") }
        let(:payload) { { crm_contact: { name: "Hacked" } } }

        run_test! do
          expect(contact.reload.name).to eq("Foreign")
        end
      end

      response "401", "unauthenticated" do
        let(:Authorization) { nil }
        let(:payload) { { crm_contact: { name: "x" } } }

        run_test!
      end
    end

    delete "Remove (soft-delete) a CRM contact" do
      tags "CRM"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string

      response "204", "discards the contact" do
        run_test! do
          expect(contact.reload).to be_discarded
        end
      end

      response "403", "forbidden for a teacher" do
        let(:Authorization) { auth_headers_for(teacher_user)["Authorization"] }

        before { make_teacher! }

        run_test! do
          expect(contact.reload).not_to be_discarded
        end
      end

      response "404", "contact of another school" do
        let(:contact) { create(:crm_contact, school: other_school) }

        run_test! do
          expect(contact.reload).not_to be_discarded
        end
      end

      response "401", "unauthenticated" do
        let(:Authorization) { nil }

        run_test!
      end
    end
  end
end
