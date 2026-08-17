# frozen_string_literal: true

require "swagger_helper"

RSpec.describe "Api::V1::Schools::Me::Charges", type: :request do
  let(:school) { create(:school) }
  let(:guardian_user) { create(:user) }
  let!(:guardian_membership) { create(:membership, user: guardian_user, school: school, role: "guardian") }
  let!(:guardian) { create(:guardian, school: school, user: guardian_user, name: "Maria Silva") }
  let(:student) { create(:student, school: school, name: "Pedro Silva") }
  let(:second_student) { create(:student, school: school, name: "Ana Silva") }
  let(:unlinked_student) { create(:student, school: school, name: "Other Family Child") }
  let!(:student_guardian_link) { create(:student_guardian, school: school, student: student, guardian: guardian) }
  let!(:second_student_guardian_link) do
    create(:student_guardian, school: school, student: second_student, guardian: guardian)
  end
  let(:billing_plan) { create(:billing_plan, school: school) }
  let(:contract) { create(:contract, school: school, student: student, billing_plan: billing_plan) }
  let(:second_contract) do
    create(:contract, school: school, student: second_student, billing_plan: billing_plan)
  end
  let(:other_guardian) { create(:guardian, school: school, name: "Other Family") }
  let(:other_student) { create(:student, school: school, name: "Other Child") }
  let(:other_contract) do
    create(:contract, school: school, student: other_student, billing_plan: billing_plan)
  end
  let(:school_id) { school.id }
  let(:Authorization) { auth_headers_for(guardian_user)["Authorization"] }
  let!(:billing_settings) { create(:school_billing_settings, :issuance_ready, school: school) }

  path "/api/v1/schools/{school_id}/me/charges" do
    parameter name: :school_id, in: :path, type: :integer

    get "List open charges" do
      tags "Guardian Me"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string
      parameter name: :student_id, in: :query, type: :integer, required: false,
                description: "Optional linked child filter"

      response "200", "family open charges only" do
        let!(:charge_c1) do
          create(:charge, :issued, school: school, contract: contract, guardian: guardian)
        end
        let!(:charge_c2) do
          create(:charge, school: school, contract: other_contract, guardian: other_guardian)
        end

        run_test! do |response|
          body = JSON.parse(response.body)
          ids = body.fetch("data").map { |row| row["id"] }
          expect(ids).to contain_exactly(charge_c1.id)
          expect(ids).not_to include(charge_c2.id)
        end
      end

      response "200", "filters by linked student_id" do
        let(:student_id) { student.id }
        let!(:charge_pedro) do
          create(:charge, :issued, school: school, contract: contract, guardian: guardian)
        end
        let!(:charge_ana) do
          create(:charge, :issued, school: school, contract: second_contract, guardian: guardian)
        end

        run_test! do |response|
          body = JSON.parse(response.body)
          ids = body.fetch("data").map { |row| row["id"] }
          expect(ids).to contain_exactly(charge_pedro.id)
          expect(ids).not_to include(charge_ana.id)
        end
      end

      response "404", "unlinked student_id filter" do
        let(:student_id) { unlinked_student.id }

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.dig("error", "code")).to eq("not_found")
        end
      end

      response "403", "non-guardian role" do
        let(:staff_user) { create(:user) }
        let!(:staff_membership) { create(:membership, :school_admin, user: staff_user, school: school) }
        let(:Authorization) { auth_headers_for(staff_user)["Authorization"] }

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.dig("error", "code")).to eq("forbidden")
        end
      end
    end
  end

  path "/api/v1/schools/{school_id}/me/charges/{id}" do
    parameter name: :school_id, in: :path, type: :integer
    parameter name: :id, in: :path, type: :integer

    get "Show charge detail" do
      tags "Guardian Me"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string

      response "200", "includes payment methods" do
        let!(:charge_c1) do
          create(:charge, :issued, school: school, contract: contract, guardian: guardian)
        end
        let(:id) { charge_c1.id }

        run_test! do |response|
          body = JSON.parse(response.body)
          payment_methods = body.dig("data", "payment_methods")
          expect(payment_methods["boleto_url"]).to eq(charge_c1.boleto_url)
          expect(payment_methods["pix_copy_paste"]).to eq(charge_c1.pix_copy_paste)
        end
      end

      response "200", "includes mora interest rate from school settings" do
        let!(:charge_c1) do
          create(:charge, :overdue, :issued, school: school, contract: contract, guardian: guardian)
        end
        let(:id) { charge_c1.id }

        run_test! do |response|
          body = JSON.parse(response.body).fetch("data")
          expect(body["interest_rate_percent"]).to eq(1.0)
          expect(body["total_amount_cents"]).to eq(charge_c1.total_amount_cents)
        end
      end

      response "404", "cross-family charge" do
        let!(:charge_c2) do
          create(:charge, school: school, contract: other_contract, guardian: other_guardian)
        end
        let(:id) { charge_c2.id }

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.dig("error", "code")).to eq("not_found")
        end
      end

      response "403", "non-guardian role" do
        let!(:charge_c1) do
          create(:charge, :issued, school: school, contract: contract, guardian: guardian)
        end
        let(:id) { charge_c1.id }
        let(:staff_user) { create(:user) }
        let!(:staff_membership) { create(:membership, :school_admin, user: staff_user, school: school) }
        let(:Authorization) { auth_headers_for(staff_user)["Authorization"] }

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.dig("error", "code")).to eq("forbidden")
        end
      end
    end
  end

  path "/api/v1/schools/{school_id}/me/charges/history" do
    parameter name: :school_id, in: :path, type: :integer

    get "List paid charge history" do
      tags "Guardian Me"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string
      parameter name: :student_id, in: :query, type: :integer, required: false,
                description: "Optional linked child filter"

      response "200", "platform paid charges with source" do
        let!(:paid_charge) do
          create(:charge, :paid, :issued, school: school, contract: contract, guardian: guardian)
        end
        let!(:payment) { create(:payment, school: school, charge: paid_charge) }

        run_test! do |response|
          body = JSON.parse(response.body)
          records = body.fetch("data")
          expect(records.size).to eq(1)
          expect(records.first["id"]).to eq(paid_charge.id)
          expect(records.first["source"]).to eq("platform")
          expect(records.first["status"]).to eq("paid")
          expect(records.first["paid_at"]).to be_present
        end
      end

      response "200", "filters history by linked student_id" do
        let(:student_id) { student.id }
        let!(:paid_pedro) do
          create(:charge, :paid, :issued, school: school, contract: contract, guardian: guardian)
        end
        let!(:paid_ana) do
          create(:charge, :paid, :issued, school: school, contract: second_contract, guardian: guardian)
        end
        let!(:payment_pedro) { create(:payment, school: school, charge: paid_pedro) }
        let!(:payment_ana) { create(:payment, school: school, charge: paid_ana) }

        run_test! do |response|
          body = JSON.parse(response.body)
          ids = body.fetch("data").map { |row| row["id"] }
          expect(ids).to contain_exactly(paid_pedro.id)
          expect(ids).not_to include(paid_ana.id)
        end
      end

      response "404", "unlinked student_id filter" do
        let(:student_id) { unlinked_student.id }

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.dig("error", "code")).to eq("not_found")
        end
      end

      response "403", "non-guardian role" do
        let(:staff_user) { create(:user) }
        let!(:staff_membership) { create(:membership, :school_admin, user: staff_user, school: school) }
        let(:Authorization) { auth_headers_for(staff_user)["Authorization"] }

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.dig("error", "code")).to eq("forbidden")
        end
      end
    end
  end

  path "/api/v1/schools/{school_id}/me/charges/{id}/reissue" do
    parameter name: :school_id, in: :path, type: :integer
    parameter name: :id, in: :path, type: :integer

    post "Reissue guardian charge" do
      tags "Guardian Me"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string

      response "200", "guardian reissues own open charge" do
        let!(:charge_c1) do
          create(:charge, :issued, :overdue, school: school, contract: contract, guardian: guardian)
        end
        let(:id) { charge_c1.id }

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.dig("data", "id")).to eq(charge_c1.id)
          expect(body.dig("data", "payment_methods", "boleto_url")).to be_present
        end
      end

      response "404", "cross-family charge" do
        let!(:charge_c2) do
          create(:charge, :issued, :overdue, school: school, contract: other_contract, guardian: other_guardian)
        end
        let(:id) { charge_c2.id }

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.dig("error", "code")).to eq("not_found")
        end
      end

      response "403", "non-guardian role" do
        let!(:charge_c1) do
          create(:charge, :issued, :overdue, school: school, contract: contract, guardian: guardian)
        end
        let(:id) { charge_c1.id }
        let(:staff_user) { create(:user) }
        let!(:staff_membership) { create(:membership, :school_admin, user: staff_user, school: school) }
        let(:Authorization) { auth_headers_for(staff_user)["Authorization"] }

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body.dig("error", "code")).to eq("forbidden")
        end
      end
    end
  end
end
