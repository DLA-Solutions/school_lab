# frozen_string_literal: true

require "swagger_helper"

RSpec.describe "Api::V1::Schools::Billing::UnmatchedBoletos", type: :request do
  let(:school) { create(:school) }
  let(:school_admin) { create(:user) }
  let!(:school_admin_membership) { create(:membership, :school_admin, user: school_admin, school: school) }
  let(:guardian_user) { create(:user) }
  let!(:guardian_membership) { create(:membership, user: guardian_user, school: school, role: "guardian") }
  let(:school_id) { school.id }
  let(:Authorization) { auth_headers_for(school_admin)["Authorization"] }

  before do
    Schools::SeedSchoolModulesService.call(school: school)
  end

  let(:guardian) { create(:guardian, school: school) }

  path "/api/v1/schools/{school_id}/billing/unmatched_boletos" do
    parameter name: :school_id, in: :path, type: :integer

    get "List bank-created boletos staff must link to a guardian" do
      tags "Billing"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string
      parameter name: :status, in: :query, type: :string, required: false,
                description: "pending (default), resolved, or dismissed; any other value falls back to pending"

      response "200", "defaults to the pending review queue" do
        let!(:pending_row) { create(:unmatched_boleto, school: school) }
        let!(:resolved_row) { create(:unmatched_boleto, :resolved, school: school) }

        run_test! do |response|
          body = JSON.parse(response.body).fetch("data")
          expect(body.map { |row| row["id"] }).to eq([ pending_row.id ])
          expect(body.first["status"]).to eq("pending")
        end
      end

      response "200", "an explicit status filters to that status" do
        let!(:pending_row) { create(:unmatched_boleto, school: school) }
        let!(:resolved_row) { create(:unmatched_boleto, :resolved, school: school) }
        let(:status) { "resolved" }

        run_test! do |response|
          body = JSON.parse(response.body).fetch("data")
          expect(body.map { |row| row["id"] }).to eq([ resolved_row.id ])
        end
      end

      response "200", "never exposes another school's rows" do
        let(:other_school) { create(:school) }
        let!(:other_row) { create(:unmatched_boleto, school: other_school) }
        let!(:own_row) { create(:unmatched_boleto, school: school) }

        run_test! do |response|
          body = JSON.parse(response.body).fetch("data")
          expect(body.map { |row| row["id"] }).to eq([ own_row.id ])
        end
      end

      response "401", "unauthenticated" do
        let(:Authorization) { nil }

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "code")).to eq("unauthorized")
        end
      end

      response "403", "a role without manage_billing" do
        let(:Authorization) { auth_headers_for(guardian_user)["Authorization"] }

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "code")).to eq("forbidden")
        end
      end
    end
  end

  path "/api/v1/schools/{school_id}/billing/unmatched_boletos/{id}/resolve" do
    parameter name: :school_id, in: :path, type: :integer
    parameter name: :id, in: :path, type: :integer

    post "Link a bank-created boleto to a guardian, creating its migrated charge" do
      tags "Billing"
      consumes "application/json"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string
      parameter name: :payload, in: :body, schema: {
        type: :object,
        properties: { guardian_id: { type: :integer } },
        required: %w[guardian_id]
      }

      response "200", "resolves the row and creates its migrated charge" do
        let!(:unmatched_boleto) { create(:unmatched_boleto, school: school, amount_cents: 80_000) }
        let(:id) { unmatched_boleto.id }
        let(:payload) { { guardian_id: guardian.id } }

        run_test! do |response|
          body = JSON.parse(response.body).fetch("data")
          expect(body["status"]).to eq("resolved")
          expect(body["resolved_guardian_id"]).to eq(guardian.id)
          expect(body["charge_id"]).to be_present

          charge = Charge.find(body["charge_id"])
          expect(charge.source).to eq("migrated")
          expect(charge.guardian_id).to eq(guardian.id)
        end
      end

      response "404", "a guardian_id belonging to another school" do
        let(:other_school) { create(:school) }
        let(:other_guardian) { create(:guardian, school: other_school) }
        let!(:unmatched_boleto) { create(:unmatched_boleto, school: school) }
        let(:id) { unmatched_boleto.id }
        let(:payload) { { guardian_id: other_guardian.id } }

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "code")).to eq("not_found")
          expect(unmatched_boleto.reload.status).to eq("pending")
        end
      end

      response "409", "a row already resolved or dismissed" do
        let!(:unmatched_boleto) { create(:unmatched_boleto, :dismissed, school: school) }
        let(:id) { unmatched_boleto.id }
        let(:payload) { { guardian_id: guardian.id } }

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "code")).to eq("invalid_state_transition")
        end
      end

      # `policy_scope(UnmatchedBoleto)` runs before `authorize` here (no guardian carve-out
      # exists on this policy, unlike ChargePolicy), so a role without manage_billing never
      # even sees the row exist — same 404 a cross-school lookup gets, not 403.
      response "404", "a role without manage_billing" do
        let!(:unmatched_boleto) { create(:unmatched_boleto, school: school) }
        let(:id) { unmatched_boleto.id }
        let(:payload) { { guardian_id: guardian.id } }
        let(:Authorization) { auth_headers_for(guardian_user)["Authorization"] }

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "code")).to eq("not_found")
        end
      end
    end
  end

  path "/api/v1/schools/{school_id}/billing/unmatched_boletos/{id}/dismiss" do
    parameter name: :school_id, in: :path, type: :integer
    parameter name: :id, in: :path, type: :integer

    post "Close out a bank-created boleto with no guardian link, creating no charge" do
      tags "Billing"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string

      response "200", "dismisses the row and creates no charge" do
        let!(:unmatched_boleto) { create(:unmatched_boleto, school: school) }
        let(:id) { unmatched_boleto.id }

        run_test! do |response|
          body = JSON.parse(response.body).fetch("data")
          expect(body["status"]).to eq("dismissed")
          expect(body["charge_id"]).to be_nil
          expect(unmatched_boleto.reload.charge_id).to be_nil
        end
      end

      response "409", "a row already resolved or dismissed" do
        let!(:unmatched_boleto) { create(:unmatched_boleto, :resolved, school: school) }
        let(:id) { unmatched_boleto.id }

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "code")).to eq("invalid_state_transition")
        end
      end

      # Same defense-in-depth ordering as resolve above: scope excludes the actor before
      # `authorize` runs, so this is 404, not 403.
      response "404", "a role without manage_billing" do
        let!(:unmatched_boleto) { create(:unmatched_boleto, school: school) }
        let(:id) { unmatched_boleto.id }
        let(:Authorization) { auth_headers_for(guardian_user)["Authorization"] }

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "code")).to eq("not_found")
        end
      end
    end
  end
end
