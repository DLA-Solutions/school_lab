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

    get "List the family's boletos (open, overdue and paid)" do
      description "Without `status` returns the legacy open list (pending + overdue, oldest due date " \
                  "first). With `status` returns the unified list, newest due date first."
      tags "Guardian Me"
      produces "application/json"
      security [ bearer_auth: [] ]
      parameter name: "Authorization", in: :header, type: :string
      parameter name: :student_id, in: :query, type: :integer, required: false,
                description: "Optional linked child filter"
      parameter name: :status, in: :query, type: :string, required: false,
                description: "`all`, or a comma separated list of paid, pending, overdue"
      parameter name: :month, in: :query, type: :integer, required: false,
                description: "1-12; requires `year`; filters by due date"
      parameter name: :year, in: :query, type: :integer, required: false,
                description: "Four-digit year; alone it covers the whole year"
      parameter name: :from, in: :query, type: :string, required: false,
                description: "ISO date, inclusive lower bound on the due date; excludes month/year"
      parameter name: :to, in: :query, type: :string, required: false,
                description: "ISO date, inclusive upper bound on the due date; excludes month/year"
      parameter name: :order, in: :query, type: :string, required: false,
                description: "asc or desc by due date (default desc with `status`, asc without)"
      parameter name: :page, in: :query, type: :integer, required: false
      parameter name: :limit, in: :query, type: :integer, required: false

      def ids_of(response)
        JSON.parse(response.body).fetch("data").map { |row| row["id"] }
      end

      response "200", "without status: family open charges only, oldest due date first" do
        let!(:charge_c1) do
          create(:charge, :issued, school: school, contract: contract, guardian: guardian,
                                   due_date: 20.days.from_now.to_date)
        end
        let!(:charge_overdue) do
          create(:charge, :overdue, :issued, school: school, contract: contract, guardian: guardian)
        end
        let!(:charge_paid) do
          create(:charge, :paid, :issued, school: school, contract: contract, guardian: guardian)
        end
        let!(:charge_c2) do
          create(:charge, school: school, contract: other_contract, guardian: other_guardian)
        end

        run_test! do |response|
          expect(ids_of(response)).to eq([ charge_overdue.id, charge_c1.id ])
        end
      end

      response "200", "status=all: every non-cancelled boleto of the family, tagged by status" do
        let(:status) { "all" }
        let!(:charge_pending) do
          create(:charge, :issued, school: school, contract: contract, guardian: guardian,
                                   due_date: Date.new(2099, 3, 10))
        end
        let!(:charge_overdue) do
          create(:charge, :overdue, :issued, school: school, contract: contract, guardian: guardian,
                                             due_date: Date.new(2020, 1, 10))
        end
        let!(:charge_paid) do
          create(:charge, :paid, :issued, school: school, contract: contract, guardian: guardian,
                                          due_date: Date.new(2020, 2, 10))
        end
        let!(:charge_cancelled) do
          create(:charge, :cancelled, school: school, contract: contract, guardian: guardian)
        end
        let!(:charge_discarded) do
          create(:charge, school: school, contract: contract, guardian: guardian).tap(&:discard)
        end
        let!(:charge_other_family) do
          create(:charge, :paid, school: school, contract: other_contract, guardian: other_guardian)
        end

        run_test! do |response|
          rows = JSON.parse(response.body).fetch("data")
          expect(rows.map { |row| row["id"] }).to eq([ charge_pending.id, charge_paid.id, charge_overdue.id ])
          expect(rows.map { |row| row["status"] }).to eq(%w[pending paid overdue])

          paid_row = rows.find { |row| row["id"] == charge_paid.id }
          expect(paid_row["paid_at"]).to be_present
          expect(paid_row).to include("due_date" => "2020-02-10", "kind" => "tuition",
                                      "total_amount_cents" => charge_paid.total_amount_cents,
                                      "interest_rate_percent" => 1.0)
          expect(paid_row["student"]).to eq("id" => student.id, "name" => "Pedro Silva")
          expect(paid_row).to have_key("payment_methods")
          expect(paid_row).not_to have_key("guardian")

          open_rows = rows - [ paid_row ]
          expect(open_rows.map { |row| row["paid_at"] }).to all(be_nil)
          expect(open_rows.first.dig("payment_methods", "boleto_url")).to be_present
        end
      end

      response "200", "status=paid returns only paid charges" do
        let(:status) { "paid" }
        let!(:charge_pending) { create(:charge, :issued, school: school, contract: contract, guardian: guardian) }
        let!(:charge_paid) { create(:charge, :paid, :issued, school: school, contract: contract, guardian: guardian) }

        run_test! do |response|
          expect(ids_of(response)).to eq([ charge_paid.id ])
        end
      end

      response "200", "status=pending,overdue returns the open charges" do
        let(:status) { "pending,overdue" }
        let!(:charge_pending) { create(:charge, :issued, school: school, contract: contract, guardian: guardian) }
        let!(:charge_overdue) do
          create(:charge, :overdue, :issued, school: school, contract: contract, guardian: guardian)
        end
        let!(:charge_paid) { create(:charge, :paid, :issued, school: school, contract: contract, guardian: guardian) }

        run_test! do |response|
          expect(ids_of(response)).to contain_exactly(charge_pending.id, charge_overdue.id)
        end
      end

      response "200", "status=overdue returns only overdue charges" do
        let(:status) { "overdue" }
        let!(:charge_pending) { create(:charge, :issued, school: school, contract: contract, guardian: guardian) }
        let!(:charge_overdue) do
          create(:charge, :overdue, :issued, school: school, contract: contract, guardian: guardian)
        end

        run_test! do |response|
          expect(ids_of(response)).to eq([ charge_overdue.id ])
        end
      end

      response "200", "month and year keep due dates inside that calendar month" do
        let(:status) { "all" }
        let(:month) { 4 }
        let(:year) { 2026 }
        let!(:march) do
          create(:charge, school: school, contract: contract, guardian: guardian, due_date: Date.new(2026, 3, 31))
        end
        let!(:april_first) do
          create(:charge, :paid, school: school, contract: contract, guardian: guardian,
                                 due_date: Date.new(2026, 4, 1))
        end
        let!(:april_last) do
          create(:charge, :overdue, school: school, contract: contract, guardian: guardian,
                                    due_date: Date.new(2026, 4, 30))
        end
        let!(:may) do
          create(:charge, school: school, contract: contract, guardian: guardian, due_date: Date.new(2026, 5, 1))
        end

        run_test! do |response|
          expect(ids_of(response)).to eq([ april_last.id, april_first.id ])
        end
      end

      response "200", "year alone covers the whole calendar year" do
        let(:status) { "all" }
        let(:year) { 2026 }
        let!(:last_year) do
          create(:charge, school: school, contract: contract, guardian: guardian, due_date: Date.new(2025, 12, 31))
        end
        let!(:this_year) do
          create(:charge, school: school, contract: contract, guardian: guardian, due_date: Date.new(2026, 12, 31))
        end

        run_test! do |response|
          expect(ids_of(response)).to eq([ this_year.id ])
        end
      end

      response "200", "from and to are inclusive bounds on the due date" do
        let(:status) { "all" }
        let(:from) { "2026-04-10" }
        let(:to) { "2026-05-10" }
        let!(:before_range) do
          create(:charge, school: school, contract: contract, guardian: guardian, due_date: Date.new(2026, 4, 9))
        end
        let!(:at_start) do
          create(:charge, school: school, contract: contract, guardian: guardian, due_date: Date.new(2026, 4, 10))
        end
        let!(:at_end) do
          create(:charge, :paid, school: school, contract: contract, guardian: guardian,
                                 due_date: Date.new(2026, 5, 10))
        end
        let!(:after_range) do
          create(:charge, school: school, contract: contract, guardian: guardian, due_date: Date.new(2026, 5, 11))
        end

        run_test! do |response|
          expect(ids_of(response)).to eq([ at_end.id, at_start.id ])
        end
      end

      response "200", "order=asc reverses the unified default" do
        let(:status) { "all" }
        let(:order) { "asc" }
        let!(:early) do
          create(:charge, school: school, contract: contract, guardian: guardian, due_date: Date.new(2026, 1, 10))
        end
        let!(:late) do
          create(:charge, school: school, contract: contract, guardian: guardian, due_date: Date.new(2026, 2, 10))
        end

        run_test! do |response|
          expect(ids_of(response)).to eq([ early.id, late.id ])
        end
      end

      response "200", "filters by linked student_id across all statuses" do
        let(:status) { "all" }
        let(:student_id) { student.id }
        let!(:charge_pedro) do
          create(:charge, :paid, :issued, school: school, contract: contract, guardian: guardian)
        end
        let!(:charge_ana) do
          create(:charge, :paid, :issued, school: school, contract: second_contract, guardian: guardian)
        end

        run_test! do |response|
          expect(ids_of(response)).to eq([ charge_pedro.id ])
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
          ids = ids_of(response)
          expect(ids).to contain_exactly(charge_pedro.id)
          expect(ids).not_to include(charge_ana.id)
        end
      end

      response "200", "paginates and reports the unfiltered total in meta" do
        let(:status) { "all" }
        let(:limit) { 2 }
        let(:page) { 2 }
        let!(:charges) do
          Array.new(5) do |index|
            create(:charge, school: school, contract: contract, guardian: guardian,
                            due_date: Date.new(2026, 1, 1) + index.days)
          end
        end

        run_test! do |response|
          body = JSON.parse(response.body)
          expect(body["meta"]).to eq("page" => 2, "per_page" => 2, "total" => 5)
          expect(body["data"].map { |row| row["id"] }).to eq([ charges[2].id, charges[1].id ])
        end
      end

      response "200", "never lists another family's or another school's charges" do
        let(:status) { "all" }
        let(:other_school) { create(:school) }
        let!(:own_charge) { create(:charge, :paid, school: school, contract: contract, guardian: guardian) }
        let!(:sibling_family_charge) do
          create(:charge, :paid, school: school, contract: other_contract, guardian: other_guardian)
        end
        let!(:other_school_charge) { create(:charge, :paid, school: other_school) }

        run_test! do |response|
          expect(ids_of(response)).to eq([ own_charge.id ])
        end
      end

      response "422", "invalid status" do
        let(:status) { "paid,bogus" }

        run_test! do |response|
          error = JSON.parse(response.body).fetch("error")
          expect(error["code"]).to eq("validation_error")
          expect(error["details"]).to have_key("status")
        end
      end

      response "422", "month without year" do
        let(:month) { 4 }

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "details")).to have_key("year")
        end
      end

      response "422", "month out of range" do
        let(:month) { 13 }
        let(:year) { 2026 }

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "details")).to have_key("month")
        end
      end

      response "422", "malformed date" do
        let(:from) { "10/04/2026" }

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "details")).to have_key("from")
        end
      end

      response "422", "from after to" do
        let(:from) { "2026-05-02" }
        let(:to) { "2026-05-01" }

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "details")).to have_key("to")
        end
      end

      response "422", "month/year combined with from/to" do
        let(:month) { 4 }
        let(:year) { 2026 }
        let(:from) { "2026-04-01" }

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "details")).to have_key("from")
        end
      end

      response "422", "invalid order" do
        let(:order) { "sideways" }

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "details")).to have_key("order")
        end
      end

      response "401", "unauthenticated" do
        let(:Authorization) { nil }

        run_test! do |response|
          expect(JSON.parse(response.body).dig("error", "code")).to eq("unauthorized")
        end
      end

      response "404", "a guardian of another school cannot list this school's charges" do
        let(:status) { "all" }
        let(:other_school) { create(:school) }
        let(:outsider_user) { create(:user) }
        let!(:outsider_membership) { create(:membership, user: outsider_user, school: other_school, role: "guardian") }
        let!(:outsider) { create(:guardian, school: other_school, user: outsider_user) }
        let!(:charge) { create(:charge, :paid, school: school, contract: contract, guardian: guardian) }
        let(:Authorization) { auth_headers_for(outsider_user)["Authorization"] }

        run_test! do |response|
          expect(response.body).not_to include(charge.id.to_s)
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
