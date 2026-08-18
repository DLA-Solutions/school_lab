# frozen_string_literal: true

require "swagger_helper"

RSpec.describe "Api::V1::Platform::HelpTaxonomy::Categories", type: :request do
  let(:operator) { create(:user) }
  let!(:operator_membership) { create(:membership, :with_configure_help_taxonomy, user: operator) }
  let(:staff_user) { create(:user) }
  let(:school) { create(:school) }
  let!(:staff_membership) { create(:membership, :staff, user: staff_user, school: school) }

  path "/api/v1/platform/help_taxonomy/categories" do
    get "List help taxonomy categories" do
      tags "Backoffice", "Help Taxonomy"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string

      response "200", "categories listed" do
        let(:Authorization) { auth_headers_for(operator)["Authorization"] }
        let!(:category) { create(:help_taxonomy_category, name: "Financeiro") }

        run_test! do |response|
          names = JSON.parse(response.body).fetch("data").map { |row| row["name"] }
          expect(names).to include("Financeiro")
        end
      end

      response "403", "staff forbidden" do
        let(:Authorization) { auth_headers_for(staff_user)["Authorization"] }

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "code")).to eq("backoffice_only")
        end
      end
    end

    post "Create help taxonomy category" do
      tags "Backoffice", "Help Taxonomy"
      consumes "application/json"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string
      parameter name: :category, in: :body, schema: {
        type: :object,
        properties: {
          category: {
            type: :object,
            properties: {
              name: { type: :string },
              module_key: { type: :string },
              persona_tags: { type: :array, items: { type: :string } },
              position: { type: :integer }
            },
            required: %w[name]
          }
        }
      }

      response "201", "category created" do
        let(:Authorization) { auth_headers_for(operator)["Authorization"] }
        let(:category) do
          {
            category: {
              name: "Financeiro",
              module_key: "billing",
              persona_tags: [ "secretary" ],
              position: 1
            }
          }
        end

        run_test! do |response|
          data = JSON.parse(response.body).fetch("data")
          expect(data.fetch("slug")).to eq("financeiro")
          expect(data.fetch("persona_tags")).to eq([ "secretary" ])
        end
      end

      response "422", "invalid persona tag" do
        let(:Authorization) { auth_headers_for(operator)["Authorization"] }
        let(:category) { { category: { name: "Bad", persona_tags: [ "invalid" ] } } }

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "code")).to eq("validation_error")
        end
      end
    end
  end

  path "/api/v1/platform/help_taxonomy/categories/{id}" do
    parameter name: :id, in: :path, type: :integer

    get "Show help taxonomy category" do
      tags "Backoffice", "Help Taxonomy"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string

      response "200", "category found" do
        let(:Authorization) { auth_headers_for(operator)["Authorization"] }
        let(:record) { create(:help_taxonomy_category) }
        let(:id) { record.id }

        run_test!
      end

      response "404", "unknown category" do
        let(:Authorization) { auth_headers_for(operator)["Authorization"] }
        let(:id) { 0 }

        run_test!
      end
    end

    patch "Update help taxonomy category" do
      tags "Backoffice", "Help Taxonomy"
      consumes "application/json"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string
      parameter name: :category, in: :body, schema: {
        type: :object,
        properties: {
          category: {
            type: :object,
            properties: {
              name: { type: :string },
              persona_tags: { type: :array, items: { type: :string } }
            }
          }
        }
      }

      response "200", "category updated" do
        let(:Authorization) { auth_headers_for(operator)["Authorization"] }
        let(:record) { create(:help_taxonomy_category, name: "Old") }
        let(:id) { record.id }
        let(:category) { { category: { name: "Updated", persona_tags: [ "director" ] } } }

        run_test! do |response|
          data = JSON.parse(response.body).fetch("data")
          expect(data.fetch("name")).to eq("Updated")
        end
      end
    end

    delete "Discard help taxonomy category" do
      tags "Backoffice", "Help Taxonomy"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string

      response "204", "category discarded" do
        let(:Authorization) { auth_headers_for(operator)["Authorization"] }
        let(:record) { create(:help_taxonomy_category) }
        let(:id) { record.id }

        run_test! do
          expect(record.reload).to be_discarded
        end
      end
    end
  end
end
