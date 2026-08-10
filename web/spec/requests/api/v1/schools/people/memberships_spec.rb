# frozen_string_literal: true

require "swagger_helper"

RSpec.describe "Api::V1::Schools::People::Memberships", type: :request do
  include ActiveJob::TestHelper

  let(:school) { create(:school) }
  let(:owner_user) { create(:user) }
  let!(:owner_membership) { create_owner_membership(school, user: owner_user).last }
  let(:school_id) { school.id }
  let(:Authorization) { auth_headers_for(owner_user)["Authorization"] }
  let!(:templates) { create_system_templates_for(school) }
  let(:secretary_template) { templates.find { |t| t.system_key == "secretary" } }
  let(:teacher_template) { templates.find { |t| t.system_key == "teacher" } }

  path "/api/v1/schools/{school_id}/people/memberships" do
    parameter name: :school_id, in: :path, type: :integer

    post "Create invited membership" do
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
              role_template_id: { type: :integer },
              segment_id: { type: :integer },
              display_title: { type: :string }
            },
            required: %w[email role]
          }
        },
        required: %w[membership]
      }

      response "201", "invited membership created" do
        let!(:guardian) { create(:guardian, school: school, email: "invite@example.com", user: nil) }
        let(:payload) do
          {
            membership: {
              email: "invite@example.com",
              role: "guardian"
            }
          }
        end

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.dig("data", "status")).to eq("invited")
          expect(body.dig("data", "role")).to eq("guardian")
          # The guardian profile is linked when the invite is accepted, matched by email — an
          # invite on its own leaves it unlinked.
          expect(guardian.reload.user_id).to be_nil

          membership = Membership.kept.find(body.dig("data", "id"))
          expect(membership.status).to eq("invited")
          expect(membership.user.email).to eq("invite@example.com")
        end
      end

      response "201", "secretary invites staff with role template" do
        let(:secretary_user) { create(:user) }
        let!(:secretary_membership) { create(:membership, :staff, user: secretary_user, school: school) }
        let(:Authorization) { auth_headers_for(secretary_user)["Authorization"] }
        let(:payload) do
          {
            membership: {
              email: "newstaff@example.com",
              role: "staff",
              role_template_id: secretary_template.id,
              display_title: "Recepção"
            }
          }
        end

        before do
          create(:staff_profile, membership: secretary_membership, school: school, role_template: secretary_template)
        end

        run_test! do |response|
          body = JSON.parse(response.body).fetch("data")
          expect(body["role"]).to eq("staff")
          expect(body["status"]).to eq("invited")
          expect(body.dig("role_template", "system_key")).to eq("secretary")
          expect(body["display_title"]).to eq("Recepção")
          expect(body["permissions"]).to include("manage_people")
        end
      end

      response "201", "teacher invite with teacher template" do
        let(:payload) do
          {
            membership: {
              email: "newteacher@example.com",
              role: "teacher",
              role_template_id: teacher_template.id
            }
          }
        end

        run_test! do |response|
          body = JSON.parse(response.body).fetch("data")
          expect(body["role"]).to eq("teacher")
          expect(body.dig("role_template", "system_key")).to eq("teacher")
        end
      end

      response "422", "staff without role_template_id" do
        let(:payload) do
          {
            membership: {
              email: "nostaff@example.com",
              role: "staff"
            }
          }
        end

        run_test! do |response|
          body = JSON.parse(response.body).fetch("error")
          expect(body["code"]).to eq("validation_error")
          expect(body["details"]).to include("role_template_id")
        end
      end

      response "404", "role template from another school" do
        let(:other_school) { create(:school) }
        let(:foreign_template) { create_system_templates_for(other_school).find { |t| t.system_key == "secretary" } }
        let(:payload) do
          {
            membership: {
              email: "foreign@example.com",
              role: "staff",
              role_template_id: foreign_template.id
            }
          }
        end

        run_test! do |response|
          body = JSON.parse(response.body).fetch("error")
          expect(body["code"]).to eq("not_found")
        end
      end

      response "403", "teacher without manage_people cannot create" do
        let(:teacher_user) { create(:user) }
        let!(:teacher_membership) { create(:membership, user: teacher_user, school: school, role: "teacher") }
        let(:Authorization) { auth_headers_for(teacher_user)["Authorization"] }
        let(:payload) do
          {
            membership: {
              email: "blocked@example.com",
              role: "guardian"
            }
          }
        end

        before do
          create(:staff_profile, membership: teacher_membership, school: school, role_template: teacher_template)
        end

        run_test!
      end
    end
  end

  path "/api/v1/schools/{school_id}/people/memberships/{id}/invite" do
    parameter name: :school_id, in: :path, type: :integer
    parameter name: :id, in: :path, type: :integer

    post "Resend invite" do
      tags "People"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string

      response "200", "invite notification enqueued" do
        let(:invitee) { create(:user, email: "resend@example.com") }
        let!(:membership) { create(:membership, :invited, user: invitee, school: school, role: "guardian") }
        let(:id) { membership.id }

        run_test! do
          expect(People::InviteMembershipNotificationJob).to have_been_enqueued.with(membership.id)
        end
      end
    end
  end
end

RSpec.describe "Membership invite notification on create", type: :request do
  include ActiveJob::TestHelper

  it "enqueues invite notification job" do
    school = create(:school)
    admin = create_owner_membership(school).first
    create(:guardian, school: school, email: "newinvite@example.com", user: nil)

    expect do
      post "/api/v1/schools/#{school.id}/people/memberships",
           params: {
             membership: {
               email: "newinvite@example.com",
               role: "guardian"
             }
           },
           headers: auth_headers_for(admin),
           as: :json
    end.to have_enqueued_job(People::InviteMembershipNotificationJob)

    expect(response).to have_http_status(:created)
  end
end
