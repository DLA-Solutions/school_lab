# frozen_string_literal: true

require "swagger_helper"

RSpec.describe "Api::V1::Users", type: :request do
  let(:backoffice_user) { create(:user) }
  let!(:backoffice_membership) { create(:membership, :backoffice, user: backoffice_user) }
  let(:school_admin_user) { create(:user) }
  let(:school) { create(:school) }
  let!(:school_admin_membership) do
    create(:membership, user: school_admin_user, school: school, role: "school")
  end
  let(:target_user) { create(:user, email: "target@example.com") }
  let!(:target_membership) { create(:membership, user: target_user, school: school) }
  let!(:refresh_token) { create(:refresh_token, user: target_user) }

  path "/api/v1/users/{id}/disable" do
    post "Disable user" do
      tags "Backoffice"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string
      parameter name: :id, in: :path, type: :string

      response "204", "user disabled and tokens revoked" do
        let(:Authorization) { auth_headers_for(backoffice_user)["Authorization"] }
        let(:id) { target_user.id }

        run_test! do
          target_user.reload
          expect(target_user.status).to eq("disabled")
          expect(target_user.disabled_by).to eq(backoffice_user)
          expect(refresh_token.reload.revoked_at).to be_present

          login = Auth::LoginService.call(email: target_user.email, password: "password123")
          expect(login.success?).to be(false)
          expect(login.error_code).to eq(:unauthorized)
        end
      end

      response "403", "forbidden for school admin" do
        let(:Authorization) { auth_headers_for(school_admin_user)["Authorization"] }
        let(:id) { target_user.id }

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.dig("error", "code")).to eq("forbidden")
          expect(target_user.reload.status).to eq("active")
        end
      end
    end
  end
end
