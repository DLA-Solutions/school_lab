# frozen_string_literal: true

require "swagger_helper"

RSpec.describe "Api::V1::Schools::People::Memberships", type: :request do
  include ActiveJob::TestHelper

  let(:school) { create(:school) }
  let(:school_admin) { create(:user) }
  let!(:school_admin_membership) { create(:membership, :school_admin, user: school_admin, school: school) }
  let(:school_id) { school.id }
  let(:Authorization) { auth_headers_for(school_admin)["Authorization"] }

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
              guardian_id: { type: :integer }
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
              role: "guardian",
              guardian_id: guardian.id
            }
          }
        end

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.dig("data", "status")).to eq("invited")
          expect(body.dig("data", "role")).to eq("guardian")
          expect(guardian.reload.user_id).to be_nil

          membership = Membership.kept.find(body.dig("data", "id"))
          expect(membership.status).to eq("invited")
          expect(membership.user.email).to eq("invite@example.com")
        end
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
    admin = create(:user)
    create(:membership, :school_admin, user: admin, school: school)
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
