# frozen_string_literal: true

require "swagger_helper"

RSpec.describe "Api::V1::Schools::Provisioning::ResendInvites", type: :request do
  let(:backoffice_user) { create(:user) }
  let!(:backoffice_membership) { create(:membership, :with_provision_school, user: backoffice_user) }
  let(:school) { create(:school, :provisioning) }
  let!(:invited_membership) do
    create(:membership, :invited, :staff, user: create(:user, email: "owner@school.example"), school: school)
  end

  path "/api/v1/schools/{school_id}/provisioning/resend_invites" do
    parameter name: :school_id, in: :path, type: :integer

    post "Resend pending provisioning invites" do
      tags "Backoffice"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string

      response "200", "pending invites re-queued" do
        let(:Authorization) { auth_headers_for(backoffice_user)["Authorization"] }
        let(:school_id) { school.id }

        run_test! do |response|
          body = JSON.parse(response.body).fetch("data")
          expect(body.fetch("resent_count")).to eq(1)
        end
      end

      response "429", "rate limited on repeated resend" do
        let(:Authorization) { auth_headers_for(backoffice_user)["Authorization"] }
        let(:school_id) { school.id }

        before do
          allow(Rails.cache).to receive(:read)
            .with("provisioning_resend_invites:#{school.id}")
            .and_return(true)
        end

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "code")).to eq("rate_limited")
        end
      end

      response "403", "forbidden outside provisioning school" do
        let(:Authorization) { auth_headers_for(backoffice_user)["Authorization"] }
        let(:active_school) { create(:school, onboarding_status: "active") }
        let(:school_id) { active_school.id }

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "code")).to eq("forbidden")
        end
      end
    end
  end
end
