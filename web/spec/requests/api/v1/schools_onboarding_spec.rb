# frozen_string_literal: true

require "swagger_helper"

RSpec.describe "Api::V1::Schools onboarding", type: :request do
  let(:backoffice_user) { create(:user) }
  let!(:backoffice_membership) { create(:membership, :with_provision_school, user: backoffice_user) }
  let(:owner_user) { create(:user) }

  path "/api/v1/schools" do
    post "Create school with onboarding" do
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
              onboarding_mode: { type: :string, enum: %w[self_serve white_glove] },
              owner_email: { type: :string, format: :email }
            },
            required: %w[name owner_email]
          }
        },
        required: %w[school]
      }

      response "201", "self-serve school created with owner invite" do
        let(:Authorization) { auth_headers_for(backoffice_user)["Authorization"] }
        let(:payload) do
          {
            school: {
              name: "Self Serve School",
              onboarding_mode: "self_serve",
              owner_email: "director@example.com"
            }
          }
        end

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.dig("data", "onboarding_status")).to eq("pending_handoff")
          expect(body.dig("data", "onboarding_mode")).to eq("self_serve")

          school = School.find(body.dig("data", "id"))
          owner = school.owner_membership
          expect(owner.status).to eq("invited")
          expect(owner.staff_profile.is_owner).to be(true)
          expect(owner.membership_invite_tokens.count).to eq(1)
        end
      end

      response "201", "white-glove school created in provisioning" do
        let(:Authorization) { auth_headers_for(backoffice_user)["Authorization"] }
        let(:payload) do
          {
            school: {
              name: "Premium School",
              onboarding_mode: "white_glove",
              owner_email: "director@premium.example"
            }
          }
        end

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.dig("data", "onboarding_status")).to eq("provisioning")
        end
      end

      response "422", "missing owner_email for backoffice" do
        let(:Authorization) { auth_headers_for(backoffice_user)["Authorization"] }
        let(:payload) { { school: { name: "No Owner School" } } }

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.dig("error", "code")).to eq("validation_error")
          expect(body.dig("error", "details", "owner_email")).to be_present
        end
      end
    end
  end

  path "/api/v1/schools/{id}/handoff" do
    parameter name: :id, in: :path, type: :integer

    post "Hand off school onboarding" do
      tags "Backoffice"
      consumes "application/json"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string
      parameter name: :payload, in: :body, schema: {
        type: :object,
        properties: {
          handoff: {
            type: :object,
            properties: {
              billing_waived: { type: :boolean }
            }
          }
        }
      }

      response "200", "owner activates self-serve school" do
        let(:school) { create(:school, :pending_handoff, onboarding_mode: "self_serve") }
        let(:id) { school.id }
        let(:Authorization) { auth_headers_for(owner_user)["Authorization"] }
        let!(:owner_membership) do
          create(:membership, :staff, user: owner_user, school: school, status: "active").tap do |membership|
            director = create_system_templates_for(school).find { |t| t.system_key == "director" }
            create(:staff_profile, :owner, membership: membership, school: school, role_template: director)
          end
        end
        let(:payload) { { handoff: { billing_waived: true } } }

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.dig("data", "onboarding_status")).to eq("active")
        end
      end

      response "403", "non-owner staff cannot handoff self-serve school" do
        let(:school) { create(:school, :pending_handoff, onboarding_mode: "self_serve") }
        let(:id) { school.id }
        let(:staff_user) { create(:user) }
        let(:Authorization) { auth_headers_for(staff_user)["Authorization"] }
        let!(:staff_membership) do
          create(:membership, :staff, user: staff_user, school: school, status: "active").tap do |membership|
            secretary = create_system_templates_for(school).find { |t| t.system_key == "secretary" }
            create(:staff_profile, membership: membership, school: school, role_template: secretary)
          end
        end
        let(:payload) { { handoff: { billing_waived: true } } }

        before do
          create(:school_payment_provider, school: school, active: true)
          owner = create(:user)
          create(:membership, :staff, user: owner, school: school, status: "active").tap do |membership|
            director = school.system_role_template("director")
            create(:staff_profile, :owner, membership: membership, school: school, role_template: director)
          end
        end

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.dig("error", "code")).to eq("forbidden")
        end
      end

      response "422", "incomplete activation checklist" do
        let(:school) { create(:school, :pending_handoff, onboarding_mode: "self_serve") }
        let(:id) { school.id }
        let(:Authorization) { auth_headers_for(owner_user)["Authorization"] }
        let!(:owner_membership) do
          create(:membership, :staff, user: owner_user, school: school, status: "active").tap do |membership|
            director = create_system_templates_for(school).find { |t| t.system_key == "director" }
            create(:staff_profile, :owner, membership: membership, school: school, role_template: director)
          end
        end
        let(:payload) { {} }

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.dig("error", "code")).to eq("validation_error")
          expect(body.dig("error", "details", "checklist")).to include("billing")
        end
      end

      response "200", "provisioning handoff for white-glove school" do
        let(:school) { create(:school, :provisioning) }
        let(:id) { school.id }
        let(:Authorization) { auth_headers_for(backoffice_user)["Authorization"] }
        let(:payload) { { handoff: { billing_waived: true } } }

        before do
          owner = create(:user, email: "owner@whiteglove.example")
          membership = create(:membership, :invited, :staff, user: owner, school: school)
          director = create_system_templates_for(school).find { |t| t.system_key == "director" }
          create(:staff_profile, :owner, membership: membership, school: school, role_template: director)
          Identity::IssueMembershipInviteTokenService.call(membership: membership, inviter: backoffice_user)
        end

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.dig("data", "onboarding_status")).to eq("pending_handoff")
        end
      end
    end
  end

  path "/api/v1/schools/{school_id}/people/memberships" do
    parameter name: :school_id, in: :path, type: :integer

    post "Create membership during provisioning" do
      tags "People"
      consumes "application/json"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string
      parameter name: :payload, in: :body, schema: {
        type: :object,
        properties: {
          membership: {
            type: :object,
            properties: {
              email: { type: :string },
              role: { type: :string },
              role_template_id: { type: :integer }
            },
            required: %w[email role role_template_id]
          }
        },
        required: %w[membership]
      }

      response "201", "backoffice with provision_school creates membership" do
        let(:school) { create(:school, :provisioning) }
        let(:school_id) { school.id }
        let(:Authorization) { auth_headers_for(backoffice_user)["Authorization"] }
        let(:secretary_template) { create_system_templates_for(school).find { |t| t.system_key == "secretary" } }
        let(:payload) do
          {
            membership: {
              email: "secretary@example.com",
              role: "staff",
              role_template_id: secretary_template.id
            }
          }
        end

        run_test!
      end

      response "403", "backoffice without provision_school forbidden" do
        let(:school) { create(:school, :provisioning) }
        let(:school_id) { school.id }
        let(:plain_backoffice) { create(:user) }
        let!(:plain_membership) { create(:membership, :backoffice, user: plain_backoffice) }
        let(:Authorization) { auth_headers_for(plain_backoffice)["Authorization"] }
        let(:secretary_template) { create_system_templates_for(school).find { |t| t.system_key == "secretary" } }
        let(:payload) do
          {
            membership: {
              email: "secretary@example.com",
              role: "staff",
              role_template_id: secretary_template.id
            }
          }
        end

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.dig("error", "code")).to eq("forbidden")
        end
      end
    end
  end
end
