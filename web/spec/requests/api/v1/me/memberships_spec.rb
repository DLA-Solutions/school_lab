# frozen_string_literal: true

require "swagger_helper"

RSpec.describe "Api::V1::Me::Memberships", type: :request do
  let(:school) { create(:school) }
  let(:user) { create(:user, email: "guardian@example.com") }
  let!(:guardian) { create(:guardian, school: school, email: "guardian@example.com", user: nil) }
  let!(:membership) { create(:membership, :invited, user: user, school: school, role: "guardian") }
  let(:id) { membership.id }
  let(:Authorization) { auth_headers_for(user)["Authorization"] }

  path "/api/v1/me/memberships/{id}/accept" do
    parameter name: :id, in: :path, type: :integer

    post "Accept membership invite" do
      tags "People"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string

      response "200", "membership activated and guardian linked" do
        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.dig("data", "status")).to eq("active")
          expect(membership.reload.status).to eq("active")
          expect(guardian.reload.user_id).to eq(user.id)
        end
      end
    end
  end
end
