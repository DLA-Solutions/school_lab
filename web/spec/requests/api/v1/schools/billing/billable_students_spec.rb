# frozen_string_literal: true

require "swagger_helper"

RSpec.describe "Api::V1::Schools::Billing::BillableStudents", type: :request do
  let(:school) { create(:school) }
  let(:staff_user) { create(:user) }
  let!(:staff_membership) { create(:membership, :school_admin, user: staff_user, school: school) }
  let(:headers) { auth_headers_for(staff_user) }
  let(:path) { "/api/v1/schools/#{school.id}/billing/billable_students" }

  let(:plan) { create(:billing_plan, school: school) }
  let(:guardian) { create(:guardian, school: school) }
  let(:student) { create(:student, school: school, name: "Ana Souza") }

  def enrol(child)
    create(:student_guardian, school: school, student: child, guardian: guardian)
    child
  end

  def contract_for(child, **attributes)
    create(:contract, { school: school, student: child, billing_plan: plan,
                        payer_guardian: guardian, negotiated_amount_cents: 85_000,
                        signature_status: "signed" }.merge(attributes))
  end

  describe "GET /api/v1/schools/:school_id/billing/billable_students" do
    it "requires authentication" do
      get path

      expect(response).to have_http_status(:unauthorized)
    end

    it "denies a guardian" do
      guardian_user = create(:user)
      create(:membership, user: guardian_user, school: school, role: "guardian")

      get path, headers: auth_headers_for(guardian_user)

      expect(response).to have_http_status(:forbidden)
    end

    it "returns one row per enrolled student with only the picker fields" do
      contract = contract_for(enrol(student))

      get path, headers: headers

      expect(response).to have_http_status(:ok)
      row = response.parsed_body["data"].sole
      expect(row.keys).to contain_exactly("student_id", "student_name", "contract_id", "payer",
                                          "without_contract", "tags")
      expect(row).to include(
        "student_id" => student.id, "student_name" => "Ana Souza", "contract_id" => contract.id,
        "without_contract" => false, "tags" => []
      )
      expect(row["payer"]).to include("id" => guardian.id)
    end

    it "tags a cancelled-signature contract with contract_id null" do
      enrol(student)
      contract_for(student, signature_status: "cancelled")

      get path, headers: headers

      row = response.parsed_body["data"].sole
      expect(row).to include("contract_id" => nil, "without_contract" => false, "tags" => [ "cancelled" ])
    end

    it "tags an active contract still pending signature with contract_id null" do
      enrol(student)
      contract_for(student, signature_status: "pending_signature")

      get path, headers: headers

      row = response.parsed_body["data"].sole
      expect(row).to include("contract_id" => nil, "without_contract" => false,
                             "tags" => [ "pending_signature" ])
    end

    it "applies both tags when a cancelled contract and an unsigned replacement coexist" do
      enrol(student)
      contract_for(student, signature_status: "cancelled")
      contract_for(student, signature_status: "pending_signature")

      get path, headers: headers

      row = response.parsed_body["data"].sole
      expect(row).to include("contract_id" => nil, "without_contract" => false,
                             "tags" => [ "cancelled", "pending_signature" ])
    end

    it "marks a student with no contract at all as without_contract, with no tags" do
      enrol(student)

      get path, headers: headers

      row = response.parsed_body["data"].sole
      expect(row).to include("contract_id" => nil, "without_contract" => true, "tags" => [])
    end

    it "filters students by the school year's calendar year" do
      enrol(student)
      current_year_contract = contract_for(student)

      next_year_class = create(:school_class, school: school, year: 2027)
      future_student = create(:student, school: school, school_class: next_year_class, name: "Beto")
      enrol(future_student)
      contract_for(future_student)

      school_year = create(:school_year, school: school, starts_on: Date.new(2026, 2, 1))

      get path, params: { school_year_id: school_year.id }, headers: headers

      expect(response).to have_http_status(:ok)
      rows = response.parsed_body["data"]
      expect(rows.pluck("contract_id")).to eq([ current_year_contract.id ])
      expect(response.parsed_body.dig("meta", "school_year_id")).to eq(school_year.id)
    end

    it "404s for a school_year_id belonging to another school" do
      foreign_school_year = create(:school_year, school: create(:school))

      get path, params: { school_year_id: foreign_school_year.id }, headers: headers

      expect(response).to have_http_status(:not_found)
    end

    it "never shows another school's students" do
      other = create(:school)
      create(:student, school: other, name: "Foreign")
      own = contract_for(enrol(student))

      get path, headers: headers

      expect(response.parsed_body["data"].pluck("contract_id")).to eq([ own.id ])
    end
  end

  # The documented contract. Behaviour is covered by the plain examples above.
  path "/api/v1/schools/{school_id}/billing/billable_students" do
    parameter name: :school_id, in: :path, type: :integer

    let(:school_id) { school.id }
    let(:Authorization) { auth_headers_for(staff_user)["Authorization"] }
    let(:school_year_id) { nil }

    get "List enrolled students for the avulso (one-off) charge flow's student picker" do
      tags "Billing"
      produces "application/json"
      security [ bearer_auth: [] ]
      description "One row per enrolled student (kept, status active), ordered by student name. " \
                  "A row carries the contract that stands for the child (active, signed) when one " \
                  "does, or `tags` explaining why none does (\"cancelled\", \"pending_signature\", " \
                  "both, or neither when the student has no contract at all — `without_contract: " \
                  "true`). Unlike the bulk charge batches listing, this endpoint never carries " \
                  "`monthly_amount_cents`, `due_day`, or `already_charged` — those depend on a " \
                  "billing period that has not been chosen yet in the avulso flow."
      parameter name: "Authorization", in: :header, type: :string
      parameter name: :school_year_id, in: :query, type: :integer, required: false,
                description: "Scopes the roster to the cohorts taught in this school year's calendar year"

      response "200", "one row per enrolled student" do
        schema type: :object,
               required: %w[data meta],
               properties: {
                 data: {
                   type: :array,
                   items: {
                     type: :object,
                     required: %w[student_id student_name contract_id payer without_contract tags],
                     properties: {
                       student_id: { type: :integer },
                       student_name: { type: :string },
                       contract_id: { type: :integer, nullable: true },
                       payer: {
                         type: :object, nullable: true,
                         properties: { id: { type: :integer }, name: { type: :string },
                                       cpf: { type: :string, nullable: true } }
                       },
                       without_contract: { type: :boolean },
                       tags: { type: :array, items: { type: :string } }
                     }
                   }
                 },
                 meta: {
                   type: :object,
                   properties: { school_year_id: { type: :integer, nullable: true } }
                 }
               }

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

        run_test!
      end
    end
  end
end
