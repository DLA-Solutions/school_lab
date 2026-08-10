# frozen_string_literal: true

require "rails_helper"

RSpec.describe "Standalone boletos, batch issuing and the dashboard", type: :request do
  let(:school) { create(:school) }
  let(:staff_user) { create(:user) }
  let!(:staff_membership) { create(:membership, :school_admin, user: staff_user, school: school) }
  let(:headers) { auth_headers_for(staff_user) }

  let(:plan) { create(:billing_plan, school: school) }
  let(:mother) { create(:guardian, school: school, name: "Maria Silva") }
  let(:student) { create(:student, school: school) }

  def link(guardian, child = student)
    create(:student_guardian, school: school, student: child, guardian: guardian,
                              relationship: "mother")
  end

  describe "a one-off boleto that answers to no contract" do
    let(:charges_path) { "/api/v1/schools/#{school.id}/billing/charges" }

    # A school bills for things nobody signed a contract about — a room rented for a weekend, a
    # replacement book for a child who already left. All the slip needs is a CPF to carry.
    it "is raised against a guardian alone" do
      post charges_path,
           params: {
             charge: { guardian_id: mother.id, total_amount_cents: 7_500,
                       due_date: "2026-09-15", description: "Aluguel da quadra" }
           },
           headers: headers, as: :json

      expect(response).to have_http_status(:created)

      body = response.parsed_body["data"]
      expect(body["kind"]).to eq("one_off")
      expect(body["contract_id"]).to be_nil
      expect(body["student"]).to be_nil
      expect(body.dig("guardian", "id")).to eq(mother.id)
    end

    it "still names the student when a contract was given" do
      link(mother)
      contract = create(:contract, school: school, student: student, billing_plan: plan,
                                   payer_guardian: mother)

      post charges_path,
           params: {
             charge: { contract_id: contract.id, total_amount_cents: 4_000, due_date: "2026-09-15" }
           },
           headers: headers, as: :json

      expect(response).to have_http_status(:created)
      expect(response.parsed_body.dig("data", "student", "id")).to eq(student.id)
    end

    # Without a contract there is nobody to fall back to, so the payer has to be named outright.
    it "refuses one with neither a contract nor a guardian" do
      post charges_path,
           params: { charge: { total_amount_cents: 7_500, due_date: "2026-09-15" } },
           headers: headers, as: :json

      expect(response).to have_http_status(:unprocessable_content)
    end

    it "lists a contract-less charge without breaking on the missing student" do
      create(:charge, school: school, guardian: mother, contract: nil, kind: "one_off",
                      billing_period: Date.new(2026, 9, 1), due_date: Date.new(2026, 9, 15))

      get charges_path, headers: headers, as: :json

      expect(response).to have_http_status(:ok)
      expect(response.parsed_body["data"].first["student"]).to be_nil
    end
  end

  describe "issuing a month in one pass" do
    let(:batches_path) { "/api/v1/schools/#{school.id}/billing/charge_batches" }
    let(:sibling) { create(:student, school: school) }
    let!(:first_contract) do
      link(mother)
      create(:contract, school: school, student: student, billing_plan: plan,
                        payer_guardian: mother, negotiated_amount_cents: 85_000, due_day: 10)
    end
    let!(:second_contract) do
      link(mother, sibling)
      create(:contract, school: school, student: sibling, billing_plan: plan,
                        payer_guardian: mother, negotiated_amount_cents: 60_000, due_day: 5)
    end

    it "offers every active contract with the amount it bills" do
      get batches_path, params: { billing_period: "2026-09" }, headers: headers

      expect(response).to have_http_status(:ok)

      rows = response.parsed_body["data"].index_by { |row| row["contract_id"] }
      expect(rows[first_contract.id]["monthly_amount_cents"]).to eq(85_000)
      expect(rows[first_contract.id]["already_charged"]).to be(false)
      expect(rows[second_contract.id].dig("payer", "id")).to eq(mother.id)
    end

    it "marks a contract the period already covers" do
      create(:charge, school: school, contract: first_contract, guardian: mother,
                      kind: "tuition", billing_period: Date.new(2026, 9, 1))

      get batches_path, params: { billing_period: "2026-09" }, headers: headers

      rows = response.parsed_body["data"].index_by { |row| row["contract_id"] }
      expect(rows[first_contract.id]["already_charged"]).to be(true)
      expect(rows[second_contract.id]["already_charged"]).to be(false)
    end

    it "bills the selected contracts at their own monthly amount" do
      post batches_path,
           params: { contract_ids: [ first_contract.id, second_contract.id ], billing_period: "2026-09" },
           headers: headers, as: :json

      expect(response).to have_http_status(:created)
      expect(response.parsed_body.dig("data", "created_count")).to eq(2)

      amounts = school.charges.kept.where(billing_period: Date.new(2026, 9, 1))
                      .pluck(:total_amount_cents)
      expect(amounts).to match_array([ 85_000, 60_000 ])
    end

    # Each family agreed to its own day; an override is for when the school wants one date.
    it "honours each contract's due day, or the override when one is given" do
      post batches_path,
           params: { contract_ids: [ first_contract.id, second_contract.id ], billing_period: "2026-09" },
           headers: headers, as: :json

      expect(school.charges.kept.pluck(:due_date))
        .to match_array([ Date.new(2026, 9, 10), Date.new(2026, 9, 5) ])

      school.charges.destroy_all

      post batches_path,
           params: { contract_ids: [ first_contract.id, second_contract.id ],
                     billing_period: "2026-10", due_date: "2026-10-20" },
           headers: headers, as: :json

      expect(school.charges.kept.pluck(:due_date).uniq).to eq([ Date.new(2026, 10, 20) ])
    end

    # Two operators pressing the button is not a reason to bill a family twice.
    it "skips a contract already charged for the period instead of duplicating it" do
      create(:charge, school: school, contract: first_contract, guardian: mother,
                      kind: "tuition", billing_period: Date.new(2026, 9, 1))

      post batches_path,
           params: { contract_ids: [ first_contract.id, second_contract.id ], billing_period: "2026-09" },
           headers: headers, as: :json

      expect(response.parsed_body.dig("data", "created_count")).to eq(1)
      expect(response.parsed_body.dig("data", "skipped_contract_ids")).to eq([ first_contract.id ])
    end

    it "hands every charge it created to the bank" do
      expect do
        post batches_path,
             params: { contract_ids: [ first_contract.id, second_contract.id ], billing_period: "2026-09" },
             headers: headers, as: :json
      end.to have_enqueued_job(Billing::IssueChargeJob).twice
    end

    it "refuses an empty selection" do
      post batches_path, params: { contract_ids: [], billing_period: "2026-09" },
                         headers: headers, as: :json

      expect(response).to have_http_status(:unprocessable_content)
    end

    it "does not reach another school's contracts" do
      other = create(:school)
      other_student = create(:student, school: other)
      foreign = create(:contract, school: other, student: other_student,
                                  billing_plan: create(:billing_plan, school: other))

      post batches_path, params: { contract_ids: [ foreign.id ], billing_period: "2026-09" },
                         headers: headers, as: :json

      expect(response.parsed_body.dig("data", "created_count")).to eq(0)
      expect(other.charges.count).to eq(0)
    end
  end

  describe "the school's ledger" do
    let(:transactions_path) { "/api/v1/schools/#{school.id}/billing/transactions" }

    it "records what came in and what went out" do
      post transactions_path,
           params: { school_transaction: { kind: "income", category: "didactic_material",
                                           amount_cents: 12_000, occurred_on: "2026-09-03",
                                           description: "Apostilas 6º ano" } },
           headers: headers, as: :json

      expect(response).to have_http_status(:created)
      expect(response.parsed_body.dig("data", "signed_amount_cents")).to eq(12_000)

      post transactions_path,
           params: { school_transaction: { kind: "expense", category: "payroll",
                                           amount_cents: 500_000, occurred_on: "2026-09-05" } },
           headers: headers, as: :json

      expect(response.parsed_body.dig("data", "signed_amount_cents")).to eq(-500_000)
    end

    it "rejects a direction it does not know" do
      post transactions_path,
           params: { school_transaction: { kind: "refund", category: "other",
                                           amount_cents: 100, occurred_on: "2026-09-05" } },
           headers: headers, as: :json

      expect(response).to have_http_status(:unprocessable_content)
    end

    it "filters by month and direction" do
      create(:school_transaction, school: school, kind: "income", occurred_on: Date.new(2026, 9, 3))
      create(:school_transaction, school: school, kind: "expense", occurred_on: Date.new(2026, 9, 4))
      create(:school_transaction, school: school, kind: "income", occurred_on: Date.new(2026, 8, 3))

      get transactions_path,
          params: { kind: "income", from: "2026-09-01", to: "2026-09-30" },
          headers: headers

      expect(response.parsed_body["data"].size).to eq(1)
    end

    it "is closed to guardians" do
      guardian_user = create(:user)
      create(:membership, user: guardian_user, school: school, role: "guardian")

      get transactions_path, headers: auth_headers_for(guardian_user), as: :json

      expect(response).to have_http_status(:forbidden)
    end
  end

  describe "the dashboard" do
    let(:dashboard_path) { "/api/v1/schools/#{school.id}/dashboard" }

    it "counts students against the start of the year" do
      # On the books since last year, and one who arrived after the year turned.
      create(:student, school: school, created_at: Date.current.beginning_of_year - 1.month)
      create(:student, school: school, created_at: Date.current.beginning_of_year + 1.day)

      get dashboard_path, headers: headers, as: :json

      expect(response).to have_http_status(:ok)

      students = response.parsed_body.dig("data", "students")
      expect(students["value"]).to eq(2)
      expect(students["previous"]).to eq(1)
      expect(students["change_percent"]).to eq(100.0)
      expect(students["is_up"]).to be(true)
    end

    it "counts staff, not families" do
      create(:membership, user: create(:user), school: school, role: "guardian")

      get dashboard_path, headers: headers, as: :json

      # Only the staff membership this spec signs in with.
      expect(response.parsed_body.dig("data", "collaborators", "value")).to eq(1)
    end

    it "reports the month's tuition against the month before" do
      link(mother)
      contract = create(:contract, school: school, student: student, billing_plan: plan,
                                   payer_guardian: mother)
      create(:charge, school: school, contract: contract, guardian: mother, kind: "tuition",
                      billing_period: Date.new(2026, 9, 1), total_amount_cents: 80_000)
      create(:charge, school: school, contract: contract, guardian: mother, kind: "tuition",
                      billing_period: Date.new(2026, 8, 1), total_amount_cents: 40_000)

      get dashboard_path, params: { month: "2026-09" }, headers: headers

      revenue = response.parsed_body.dig("data", "monthly_revenue")
      expect(revenue["value"]).to eq(80_000)
      expect(revenue["previous"]).to eq(40_000)
      expect(revenue["change_percent"]).to eq(100.0)
    end

    it "separates what the textbooks brought in" do
      create(:school_transaction, school: school, kind: "income", category: "didactic_material",
                                  amount_cents: 30_000, occurred_on: Date.new(2026, 9, 2))
      create(:school_transaction, school: school, kind: "income", category: "donation",
                                  amount_cents: 90_000, occurred_on: Date.new(2026, 9, 2))

      get dashboard_path, params: { month: "2026-09" }, headers: headers

      expect(response.parsed_body.dig("data", "didactic_material", "value")).to eq(30_000)
    end

    it "draws a full year of income even where there was none" do
      create(:school_transaction, school: school, kind: "income", amount_cents: 10_000,
                                  occurred_on: Date.new(2026, 3, 9))
      create(:school_transaction, school: school, kind: "expense", amount_cents: 99_000,
                                  occurred_on: Date.new(2026, 3, 9))

      get dashboard_path, params: { month: "2026-09" }, headers: headers

      series = response.parsed_body.dig("data", "monthly_income_series")
      expect(series.size).to eq(12)
      expect(series.find { |point| point["month"] == "2026-03" }["amount_cents"]).to eq(10_000)
      expect(series.find { |point| point["month"] == "2026-04" }["amount_cents"]).to eq(0)
    end

    it "spreads the enrolled children across the cohorts, largest first" do
      first = create(:school_class, school: school, name: "A")
      second = create(:school_class, school: school, name: "B")
      2.times { create(:student, school: school, school_class: second) }
      3.times { create(:student, school: school, school_class: first) }

      get dashboard_path, headers: headers

      rows = response.parsed_body.dig("data", "students_by_class")
      expect(rows.map { |row| [ row["name"], row["students"] ] }).to eq([ [ "A", 3 ], [ "B", 2 ] ])
    end

    # Leaving them out would make the slices add up to less than the head count above, with
    # nothing on screen to explain the gap.
    it "keeps students who are in no live class as their own slice" do
      school_class = create(:school_class, school: school)
      create(:student, school: school, school_class: school_class)

      # A discarded cohort leaves its students pointing at a class that is no longer on the
      # register — they belong to nobody until the school moves them.
      gone = create(:school_class, school: school)
      create(:student, school: school, school_class: gone)
      gone.discard

      get dashboard_path, headers: headers

      rows = response.parsed_body.dig("data", "students_by_class")
      unassigned = rows.find { |row| row["school_class_id"].nil? }
      expect(unassigned["students"]).to eq(1)
      expect(rows.sum { |row| row["students"] })
        .to eq(response.parsed_body.dig("data", "students", "value"))
    end

    it "is closed to guardians" do
      guardian_user = create(:user)
      create(:membership, user: guardian_user, school: school, role: "guardian")

      get dashboard_path, headers: auth_headers_for(guardian_user), as: :json

      expect(response).to have_http_status(:forbidden)
    end
  end
end
