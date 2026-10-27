# frozen_string_literal: true

require "swagger_helper"

RSpec.describe "Api::V1::Schools::Billing::Charges", type: :request do
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
  let(:student) { create(:student, school: school) }
  let(:billing_plan) { create(:billing_plan, school: school) }
  let(:contract) do
    create(:contract, school: school, student: student, billing_plan: billing_plan)
  end

  path "/api/v1/schools/{school_id}/billing/charges" do
    parameter name: :school_id, in: :path, type: :integer

    get "List charges" do
      tags "Billing"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string

      response "200", "charges expose amounts in cents when billing module enabled" do
        let!(:charge) do
          create(:charge, school: school, contract: contract, guardian: guardian, total_amount_cents: 150_000)
        end

        run_test! do |response|
          body = JSON.parse(response.body).fetch("data")
          record = body.find { |item| item["id"] == charge.id }

          expect(record["total_amount_cents"]).to eq(150_000)
          expect(record).not_to have_key("total_amount")
        end
      end

      response "200", "exposes the same payment_methods the guardian sees (Inter has no boleto_url)" do
        let!(:charge) do
          create(:charge, school: school, contract: contract, guardian: guardian).tap do |record|
            create(:charge_issuance, :issued, charge: record, school: school, provider: "inter",
                                              boleto_url: nil,
                                              digitable_line: "23793.38128 60000.000003 00000.000400 1 93480000085000",
                                              pix_emv: "00020126580014br.gov.bcb.pix0136abc")
            record.sync_invoice_cache!
          end
        end

        run_test! do |response|
          record = JSON.parse(response.body).fetch("data").find { |item| item["id"] == charge.id }

          expect(record["payment_methods"]).to eq({
            "boleto_url" => nil,
            "pix_copy_paste" => "00020126580014br.gov.bcb.pix0136abc",
            "digitable_line" => "23793.38128 60000.000003 00000.000400 1 93480000085000",
            "boleto_pdf_available" => true
          })
        end
      end

      response "200", "lists payment_methods without one issuance query per charge" do
        let!(:charges) do
          Array.new(3) do
            create(:charge, school: school, contract: contract, guardian: guardian).tap do |record|
              create(:charge_issuance, :issued, charge: record, school: school, provider: "inter")
            end
          end
        end

        run_test! do |response|
          expect(JSON.parse(response.body).fetch("data").size).to eq(3)
          issuance_selects = []
          callback = lambda do |*, payload|
            issuance_selects << payload[:sql] if payload[:sql].match?(/FROM "charge_issuances"/)
          end
          ActiveSupport::Notifications.subscribed(callback, "sql.active_record") do
            get "/api/v1/schools/#{school_id}/billing/charges", headers: { "Authorization" => self.Authorization }
          end
          expect(issuance_selects.size).to eq(1)
        end
      end

      response "403", "billing module disabled" do
        before do
          Schools::SeedSchoolModulesService.call(school: school, overrides: { billing: false })
        end

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "code")).to eq("module_disabled")
        end
      end
    end
  end

  path "/api/v1/schools/{school_id}/billing/charges/{id}/cancel" do
    parameter name: :school_id, in: :path, type: :integer
    parameter name: :id, in: :path, type: :integer

    post "Cancel charge" do
      tags "Billing"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string

      response "200", "pending charge cancelled" do
        let!(:charge) { create(:charge, school: school, contract: contract, guardian: guardian) }
        let(:id) { charge.id }

        run_test! do
          expect(charge.reload.status).to eq("cancelled")
        end
      end

      response "403", "billing module disabled" do
        let!(:charge) { create(:charge, school: school, contract: contract, guardian: guardian) }
        let(:id) { charge.id }

        before do
          Schools::SeedSchoolModulesService.call(school: school, overrides: { billing: false })
        end

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "code")).to eq("module_disabled")
        end
      end

      response "409", "second cancel returns invalid_state_transition" do
        let!(:charge) { create(:charge, :cancelled, school: school, contract: contract, guardian: guardian) }
        let(:id) { charge.id }

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.dig("error", "code")).to eq("invalid_state_transition")
        end
      end
    end
  end

  path "/api/v1/schools/{school_id}/billing/charges/{id}" do
    parameter name: :school_id, in: :path, type: :integer
    parameter name: :id, in: :path, type: :integer

    get "Show charge" do
      tags "Billing"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string

      response "200", "exposes the same payment_methods the guardian sees" do
        let!(:charge) do
          create(:charge, school: school, contract: contract, guardian: guardian).tap do |record|
            create(:charge_issuance, :issued, charge: record, school: school, provider: "inter",
                                              boleto_url: nil,
                                              digitable_line: "23793.38128 60000.000003 00000.000400 1 93480000085000",
                                              pix_emv: "00020126580014br.gov.bcb.pix0136abc")
            record.sync_invoice_cache!
          end
        end
        let(:id) { charge.id }

        run_test! do |response|
          expect(JSON.parse(response.body).dig("data", "payment_methods")).to eq({
            "boleto_url" => nil,
            "pix_copy_paste" => "00020126580014br.gov.bcb.pix0136abc",
            "digitable_line" => "23793.38128 60000.000003 00000.000400 1 93480000085000",
            "boleto_pdf_available" => true
          })
        end
      end

      response "200", "keeps the four payment_methods keys empty until the bank produced the boleto" do
        let!(:charge) do
          create(:charge, school: school, contract: contract, guardian: guardian).tap do |record|
            create(:charge_issuance, :issued, charge: record, school: school, provider: "inter",
                                              boleto_url: nil, digitable_line: nil, barcode: nil,
                                              our_number: nil, pix_emv: nil)
            record.sync_invoice_cache!
          end
        end
        let(:id) { charge.id }

        run_test! do |response|
          expect(JSON.parse(response.body).dig("data", "payment_methods")).to eq(
            "boleto_url" => nil, "pix_copy_paste" => nil, "digitable_line" => nil,
            "boleto_pdf_available" => false
          )
        end
      end

      response "404", "a charge of another school" do
        let(:other_school) { create(:school) }
        let(:id) { create(:charge, school: other_school, guardian: create(:guardian, school: other_school)).id }

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "code")).to eq("not_found")
        end
      end
    end

    delete "Discard charge" do
      tags "Billing"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string

      response "204", "soft-discards erroneous charge" do
        let!(:charge) do
          create(:charge, school: school, contract: contract, guardian: guardian)
        end
        let(:id) { charge.id }

        run_test! do
          charge.reload
          expect(charge.discarded_at).to be_present
          expect(charge.status).to eq("pending")
        end
      end

      response "403", "billing module disabled" do
        let!(:charge) do
          create(:charge, school: school, contract: contract, guardian: guardian)
        end
        let(:id) { charge.id }

        before do
          Schools::SeedSchoolModulesService.call(school: school, overrides: { billing: false })
        end

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "code")).to eq("module_disabled")
        end
      end
    end
  end

  path "/api/v1/schools/{school_id}/billing/charges/{id}/reissue" do
    parameter name: :school_id, in: :path, type: :integer
    parameter name: :id, in: :path, type: :integer

    post "Reissue charge" do
      tags "Billing"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string

      response "409", "reissue paid charge returns conflict" do
        let!(:charge) { create(:charge, :paid, school: school, contract: contract, guardian: guardian) }
        let(:id) { charge.id }

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.dig("error", "code")).to eq("invalid_state_transition")
        end
      end

      response "403", "billing module disabled" do
        let!(:charge) { create(:charge, school: school, contract: contract, guardian: guardian) }
        let(:id) { charge.id }

        before do
          Schools::SeedSchoolModulesService.call(school: school, overrides: { billing: false })
        end

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "code")).to eq("module_disabled")
        end
      end
    end
  end
end
