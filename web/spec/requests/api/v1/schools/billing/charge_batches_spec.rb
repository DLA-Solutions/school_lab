# frozen_string_literal: true

require "swagger_helper"

RSpec.describe "Api::V1::Schools::Billing::ChargeBatches", type: :request do
  let(:school) { create(:school) }
  let(:staff_user) { create(:user) }
  let!(:staff_membership) { create(:membership, :school_admin, user: staff_user, school: school) }
  let(:headers) { auth_headers_for(staff_user) }
  let(:batches_path) { "/api/v1/schools/#{school.id}/billing/charge_batches" }

  let(:plan) { create(:billing_plan, school: school) }
  let(:guardian) { create(:guardian, school: school) }
  let(:student) { create(:student, school: school, name: "Ana Souza") }

  def enrol(child)
    create(:student_guardian, school: school, student: child, guardian: guardian)
    child
  end

  def contract_for(child, **attributes)
    create(:contract, { school: school, student: child, billing_plan: plan,
                        payer_guardian: guardian, negotiated_amount_cents: 85_000 }.merge(attributes))
  end

  def row_ids
    response.parsed_body["data"].pluck("contract_id")
  end

  describe "GET /api/v1/schools/:school_id/billing/charge_batches" do
    it "requires authentication" do
      get batches_path, params: { billing_period: "2026-09" }

      expect(response).to have_http_status(:unauthorized)
    end

    it "offers the active contract of an enrolled student" do
      contract = contract_for(enrol(student))

      get batches_path, params: { billing_period: "2026-09" }, headers: headers

      expect(response).to have_http_status(:ok)
      expect(row_ids).to eq([ contract.id ])
      expect(response.parsed_body.dig("meta", "billing_period")).to eq("2026-09-01")
      expect(response.parsed_body["data"].first).to include(
        "contract_id" => contract.id, "student_id" => student.id, "student_name" => "Ana Souza",
        "monthly_amount_cents" => 85_000, "due_day" => 10, "already_charged" => false,
        "without_contract" => false
      )
      expect(response.parsed_body["data"].first["payer"]).to include("id" => guardian.id)
    end

    it "leaves out a student who transferred out" do
      transferred = enrol(create(:student, school: school, status: "transferred"))
      contract_for(transferred)
      kept_contract = contract_for(enrol(student))

      get batches_path, params: { billing_period: "2026-09" }, headers: headers

      expect(row_ids).to eq([ kept_contract.id ])
    end

    it "leaves out a discarded student" do
      removed = enrol(create(:student, school: school))
      contract_for(removed)
      removed.discard
      kept_contract = contract_for(enrol(student))

      get batches_path, params: { billing_period: "2026-09" }, headers: headers

      expect(row_ids).to eq([ kept_contract.id ])
    end

    it "leaves out a student whose status is not active" do
      inactive = enrol(create(:student, school: school))
      inactive.update_columns(status: "inactive")
      contract_for(inactive)

      get batches_path, params: { billing_period: "2026-09" }, headers: headers

      expect(row_ids).to be_empty
    end

    it "lists a child with two active contracts once, at the chosen contract's amount" do
      enrol(student)
      contract_for(student, negotiated_amount_cents: 70_000)
      newer = contract_for(student, negotiated_amount_cents: 90_000)

      get batches_path, params: { billing_period: "2026-09" }, headers: headers

      rows = response.parsed_body["data"]
      expect(rows.size).to eq(1)
      expect(rows.first["contract_id"]).to eq(newer.id)
      expect(rows.first["monthly_amount_cents"]).to eq(90_000)
    end

    it "prefers the contract whose window covers today over a newer one that has not started" do
      enrol(student)
      current = contract_for(student, starts_on: Date.current.beginning_of_year, ends_on: nil)
      contract_for(student, starts_on: Date.current + 6.months, negotiated_amount_cents: 99_000)

      get batches_path, params: { billing_period: "2026-09" }, headers: headers

      expect(row_ids).to eq([ current.id ])
    end

    it "leaves out ended and suspended contracts" do
      enrol(student)
      contract_for(student, status: "ended")
      contract_for(student, status: "suspended")

      get batches_path, params: { billing_period: "2026-09" }, headers: headers

      expect(response.parsed_body["data"].sole).to include("contract_id" => nil, "without_contract" => true)
    end

    it "leaves out a contract whose signature was cancelled and falls back to the other one" do
      enrol(student)
      valid = contract_for(student, negotiated_amount_cents: 80_000)
      contract_for(student, signature_status: "cancelled", negotiated_amount_cents: 95_000)

      get batches_path, params: { billing_period: "2026-09" }, headers: headers

      rows = response.parsed_body["data"]
      expect(rows.pluck("contract_id")).to eq([ valid.id ])
      expect(rows.first["monthly_amount_cents"]).to eq(80_000)
    end

    it "flags already_charged against the chosen contract only" do
      enrol(student)
      older = contract_for(student)
      chosen = contract_for(student)
      create(:charge, school: school, contract: older, guardian: guardian,
                      kind: "tuition", billing_period: Date.new(2026, 9, 1))

      get batches_path, params: { billing_period: "2026-09" }, headers: headers

      row = response.parsed_body["data"].sole
      expect(row["contract_id"]).to eq(chosen.id)
      expect(row["already_charged"]).to be(false)
    end

    it "orders the rows by student name" do
      zeca = contract_for(enrol(create(:student, school: school, name: "Zeca")))
      bia = contract_for(enrol(create(:student, school: school, name: "bia")))
      ana = contract_for(enrol(student))

      get batches_path, params: { billing_period: "2026-09" }, headers: headers

      expect(row_ids).to eq([ ana.id, bia.id, zeca.id ])
    end

    it "lists an enrolled student with no eligible contract as a row that cannot be billed" do
      enrol(student)
      contract_for(student, signature_status: "cancelled")
      other = enrol(create(:student, school: school, name: "Bruno"))
      contract_for(other)

      get batches_path, params: { billing_period: "2026-09" }, headers: headers

      rows = response.parsed_body["data"]
      expect(rows.pluck("student_name")).to eq([ "Ana Souza", "Bruno" ])
      expect(rows.first).to eq(
        "contract_id" => nil, "student_id" => student.id, "student_name" => "Ana Souza",
        "payer" => nil, "monthly_amount_cents" => nil, "due_day" => nil,
        "already_charged" => false, "without_contract" => true
      )
      expect(rows.last["without_contract"]).to be(false)
    end

    it "lists a student with no contract at all, but not a transferred or discarded one" do
      enrol(student)
      enrol(create(:student, school: school, status: "transferred"))
      removed = create(:student, school: school)
      removed.discard

      get batches_path, params: { billing_period: "2026-09" }, headers: headers

      expect(response.parsed_body["data"].pluck("student_id")).to eq([ student.id ])
    end

    it "does not list a child with a standing contract a second time as without a contract" do
      contract_for(enrol(student))
      contract_for(student, signature_status: "cancelled")

      get batches_path, params: { billing_period: "2026-09" }, headers: headers

      expect(response.parsed_body["data"].pluck("without_contract")).to eq([ false ])
    end

    it "never shows another school's contracts or students" do
      other = create(:school)
      other_student = create(:student, school: other)
      create(:contract, school: other, student: other_student,
                        billing_plan: create(:billing_plan, school: other))
      create(:student, school: other, name: "Foreign no contract")
      own = contract_for(enrol(student))

      get batches_path, params: { billing_period: "2026-09" }, headers: headers

      expect(row_ids).to eq([ own.id ])
    end

    it "rejects an invalid period" do
      get batches_path, params: { billing_period: "not-a-date" }, headers: headers

      expect(response).to have_http_status(:unprocessable_content)
    end
  end

  describe "POST /api/v1/schools/:school_id/billing/charge_batches" do
    def post_batch(ids)
      post batches_path, params: { contract_ids: ids, billing_period: "2026-09" },
                         headers: headers, as: :json
    end

    it "bills one boleto per child even when two contract ids of the same child are sent" do
      enrol(student)
      older = contract_for(student, negotiated_amount_cents: 70_000)
      chosen = contract_for(student, negotiated_amount_cents: 90_000)

      expect { post_batch([ older.id, chosen.id ]) }.to change(school.charges, :count).by(1)

      data = response.parsed_body["data"]
      expect(response).to have_http_status(:created)
      expect(data["created_count"]).to eq(1)
      expect(data["ineligible_contract_ids"]).to eq([ older.id ])
      expect(data["skipped_contract_ids"]).to be_empty
      expect(school.charges.sole.contract_id).to eq(chosen.id)
      expect(school.charges.sole.total_amount_cents).to eq(90_000)
    end

    it "does not bill a student who is no longer enrolled" do
      transferred = enrol(create(:student, school: school, status: "transferred"))
      contract = contract_for(transferred)

      expect { post_batch([ contract.id ]) }.not_to change(Charge, :count)

      expect(response.parsed_body.dig("data", "ineligible_contract_ids")).to eq([ contract.id ])
      expect(response.parsed_body.dig("data", "skipped_contract_ids")).to be_empty
    end

    it "does not echo or bill another school's contract ids" do
      other = create(:school)
      foreign = create(:contract, school: other, student: create(:student, school: other),
                                  billing_plan: create(:billing_plan, school: other))

      expect { post_batch([ foreign.id ]) }.not_to change(Charge, :count)

      expect(response.parsed_body.dig("data", "skipped_contract_ids")).to be_empty
      expect(response.parsed_body.dig("data", "ineligible_contract_ids")).to be_empty
    end

    it "keeps skipped_contract_ids for a period the contract already has a charge in" do
      contract = contract_for(enrol(student))
      create(:charge, school: school, contract: contract, guardian: guardian,
                      kind: "tuition", billing_period: Date.new(2026, 9, 1))

      post_batch([ contract.id ])

      data = response.parsed_body["data"]
      expect(data["skipped_contract_ids"]).to eq([ contract.id ])
      expect(data["ineligible_contract_ids"]).to be_empty
      expect(data["contract_ids_without_payer"]).to be_empty
    end

    it "never bills a student who has no contract, whatever ids are sent" do
      enrol(student)

      expect { post_batch([ student.id ]) }.not_to change(Charge, :count)
    end
  end

  # The documented contract. Behaviour is covered by the plain examples above.
  path "/api/v1/schools/{school_id}/billing/charge_batches" do
    parameter name: :school_id, in: :path, type: :integer

    let(:school_id) { school.id }
    let(:Authorization) { auth_headers_for(staff_user)["Authorization"] }

    get "List what can be issued in one pass: one row per enrolled student" do
      tags "Billing"
      produces "application/json"
      security [ bearer_auth: [] ]
      description "One row per enrolled student (kept, status active), ordered by student name. " \
                  "A row carries the contract that stands for the child (active, signature not " \
                  "cancelled, window covering today else highest id) and the amount it bills. " \
                  "An enrolled student with no eligible contract appears with `without_contract: true`, " \
                  "`contract_id: null` and null payer/amount/due day; such a row is never billable."
      parameter name: "Authorization", in: :header, type: :string
      parameter name: :billing_period, in: :query, type: :string, required: false,
                description: "YYYY-MM or a date; defaults to the current month", example: "2026-09"

      response "200", "one row per enrolled student" do
        schema type: :object,
               required: %w[data meta],
               properties: {
                 data: {
                   type: :array,
                   items: {
                     type: :object,
                     required: %w[contract_id student_id student_name payer monthly_amount_cents due_day
                                  already_charged without_contract],
                     properties: {
                       contract_id: { type: :integer, nullable: true },
                       student_id: { type: :integer },
                       student_name: { type: :string },
                       payer: {
                         type: :object, nullable: true,
                         properties: { id: { type: :integer }, name: { type: :string },
                                       cpf: { type: :string, nullable: true } }
                       },
                       monthly_amount_cents: { type: :integer, nullable: true },
                       due_day: { type: :integer, nullable: true },
                       already_charged: { type: :boolean },
                       without_contract: { type: :boolean }
                     }
                   }
                 },
                 meta: { type: :object, properties: { billing_period: { type: :string, example: "2026-09-01" } } }
               }

        let(:billing_period) { "2026-09" }

        before do
          contract_for(enrol(student))
          enrol(create(:student, school: school, name: "Zeca"))
        end

        run_test! do |response|
          rows = JSON.parse(response.body).fetch("data")
          expect(rows.pluck("without_contract")).to eq([ false, true ])
        end
      end

      response "401", "not authenticated" do
        let(:Authorization) { nil }
        let(:billing_period) { "2026-09" }

        run_test!
      end

      response "422", "invalid billing period" do
        let(:billing_period) { "not-a-date" }

        run_test!
      end
    end

    post "Issue the selected contracts' boletos for a month" do
      tags "Billing"
      consumes "application/json"
      produces "application/json"
      security [ bearer_auth: [] ]
      description "Bills only the standing contract of each enrolled student. `skipped_contract_ids` " \
                  "means the period already has a charge for that contract; " \
                  "`ineligible_contract_ids` are the school's contracts that may not be billed " \
                  "(student not enrolled, or not the contract standing for the child); " \
                  "`contract_ids_without_payer` have no guardian to name on the boleto."
      parameter name: "Authorization", in: :header, type: :string
      parameter name: :payload, in: :body, schema: {
        type: :object,
        properties: {
          contract_ids: { type: :array, items: { type: :integer } },
          billing_period: { type: :string, example: "2026-09" },
          due_date: { type: :string, format: :date, nullable: true }
        },
        required: %w[contract_ids billing_period]
      }

      response "201", "charges created" do
        schema type: :object,
               properties: {
                 data: {
                   type: :object,
                   required: %w[created_charges created_count skipped_contract_ids ineligible_contract_ids
                                contract_ids_without_payer],
                   properties: {
                     created_charges: { type: :array, items: { type: :object } },
                     created_count: { type: :integer },
                     skipped_contract_ids: { type: :array, items: { type: :integer } },
                     ineligible_contract_ids: { type: :array, items: { type: :integer } },
                     contract_ids_without_payer: { type: :array, items: { type: :integer } }
                   }
                 }
               }

        let(:contract) { contract_for(enrol(student)) }
        let(:payload) { { contract_ids: [ contract.id ], billing_period: "2026-09" } }

        run_test! do |response|
          expect(JSON.parse(response.body).dig("data", "created_count")).to eq(1)
        end
      end

      response "401", "not authenticated" do
        let(:Authorization) { nil }
        let(:payload) { { contract_ids: [ 1 ], billing_period: "2026-09" } }

        run_test!
      end

      response "422", "no contracts selected" do
        let(:payload) { { contract_ids: [], billing_period: "2026-09" } }

        run_test!
      end
    end
  end
end
