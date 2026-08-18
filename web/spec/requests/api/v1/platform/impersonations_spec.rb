# frozen_string_literal: true

require "swagger_helper"

RSpec.describe "Api::V1::Platform::Impersonations", type: :request do
  let(:operator) { create(:user) }
  let!(:operator_membership) { create(:membership, :with_manage_backoffice_ops, user: operator) }
  let(:school) { create(:school) }
  let(:director_user) { create(:user) }
  let!(:director_membership) { create(:membership, :staff, user: director_user, school: school) }
  let(:director_template) { create_system_templates_for(school).find { |t| t.system_key == "director" } }
  let!(:director_profile) do
    create(:staff_profile, membership: director_membership, school: school, role_template: director_template)
  end
  let(:guardian_user) { create(:user) }
  let!(:guardian_membership) { create(:membership, user: guardian_user, school: school, role: "guardian") }

  path "/api/v1/platform/impersonations" do
    post "Start impersonation" do
      tags "Backoffice", "Platform Impersonation"
      consumes "application/json"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string
      parameter name: :impersonation, in: :body, schema: {
        type: :object,
        properties: {
          impersonation: {
            type: :object,
            properties: {
              school_id: { type: :integer },
              target_membership_id: { type: :integer }
            },
            required: %w[school_id target_membership_id]
          }
        }
      }

      response "201", "impersonation started" do
        let(:Authorization) { auth_headers_for(operator)["Authorization"] }
        let(:impersonation) do
          { impersonation: { school_id: school.id, target_membership_id: director_membership.id } }
        end

        run_test! do |response|
          data = JSON.parse(response.body).fetch("data")
          expect(data.fetch("access_token")).to be_present
          expect(data.fetch("operator_email")).to eq(operator.email)
          expect(data.fetch("school_name")).to eq(school.name)
        end
      end

      response "403", "guardian membership rejected" do
        let(:Authorization) { auth_headers_for(operator)["Authorization"] }
        let(:impersonation) do
          { impersonation: { school_id: school.id, target_membership_id: guardian_membership.id } }
        end

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "code")).to eq("forbidden")
        end
      end

      response "404", "unknown membership" do
        let(:Authorization) { auth_headers_for(operator)["Authorization"] }
        let(:impersonation) do
          { impersonation: { school_id: school.id, target_membership_id: 0 } }
        end

        run_test!
      end
    end
  end

  path "/api/v1/platform/impersonations/{id}" do
    parameter name: :id, in: :path, type: :integer

    delete "End impersonation" do
      tags "Backoffice", "Platform Impersonation"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string

      response "204", "session ended" do
        let(:Authorization) { auth_headers_for(operator)["Authorization"] }
        let!(:session) do
          create(
            :platform_impersonation_session,
            operator_user: operator,
            target_user: director_user,
            school: school,
            target_membership: director_membership
          )
        end
        let(:id) { session.id }

        run_test! do
          expect(session.reload.ended_at).to be_present
        end
      end

      response "409", "already ended" do
        let(:Authorization) { auth_headers_for(operator)["Authorization"] }
        let!(:session) do
          create(
            :platform_impersonation_session,
            :ended,
            operator_user: operator,
            target_user: director_user,
            school: school,
            target_membership: director_membership
          )
        end
        let(:id) { session.id }

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "code")).to eq("invalid_state_transition")
        end
      end

      response "404", "unknown session" do
        let(:Authorization) { auth_headers_for(operator)["Authorization"] }
        let(:id) { 0 }

        run_test!
      end
    end
  end
end
