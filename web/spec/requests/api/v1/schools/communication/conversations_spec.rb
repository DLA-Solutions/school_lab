# frozen_string_literal: true

require "swagger_helper"

RSpec.describe "Api::V1::Schools::Communication::Conversations", type: :request do
  let(:school) { create(:school) }
  let(:user) { create(:user) }
  let!(:membership) { create(:membership, user: user, school: school, role: "school", status: "active") }
  let(:Authorization) { auth_headers_for(user)["Authorization"] }

  path "/api/v1/schools/{school_id}/communication/conversations" do
    parameter name: :school_id, in: :path, type: :integer

    get "List conversations (phase 2)" do
      tags "Communication"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string

      response "501", "not implemented" do
        let(:school_id) { school.id }

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.dig("error", "code")).to eq("not_implemented")
        end
      end
    end
  end
end

RSpec.describe "Disabled user access", type: :request do
  let(:school) { create(:school) }
  let(:user) { create(:user, :disabled) }
  let!(:membership) { create(:membership, user: user, school: school, role: "school", status: "active") }
  let(:headers) { auth_headers_for(user) }

  it "denies school-scoped access with 401" do
    get "/api/v1/schools/#{school.id}/communication/conversations", headers: headers

    expect(response).to have_http_status(:unauthorized)
    expect(json.dig("error", "code")).to eq("unauthorized")
  end
end
