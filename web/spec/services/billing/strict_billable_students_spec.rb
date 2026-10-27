# frozen_string_literal: true

require "rails_helper"

RSpec.describe Billing::StrictBillableStudents do
  let(:school) { create(:school) }
  let(:on) { Date.new(2026, 10, 27) }

  def rows_for(students, contracts)
    described_class.rows_for(students, contracts, on: on)
  end

  describe ".rows_for" do
    it "treats an active, signed contract as billable with no tags" do
      student = create(:student, school: school)
      contract = create(:contract, school: school, student: student, status: "active", signature_status: "signed")

      rows = rows_for([ student ], [ contract ])

      expect(rows.size).to eq(1)
      expect(rows.first.student).to eq(student)
      expect(rows.first.contract).to eq(contract)
      expect(rows.first.tags).to eq([])
      expect(rows.first.billable?).to be(true)
      expect(rows.first.without_contract?).to be(false)
    end

    it "tags a cancelled-signature contract with no signed replacement as not billable" do
      student = create(:student, school: school)
      contract = create(:contract, school: school, student: student, status: "active",
                                    signature_status: "cancelled")

      rows = rows_for([ student ], [ contract ])

      expect(rows.first.contract).to be_nil
      expect(rows.first.tags).to eq([ "cancelled" ])
      expect(rows.first.billable?).to be(false)
    end

    it "tags an active contract still pending signature as not billable" do
      student = create(:student, school: school)
      contract = create(:contract, school: school, student: student, status: "active",
                                    signature_status: "pending_signature")

      rows = rows_for([ student ], [ contract ])

      expect(rows.first.contract).to be_nil
      expect(rows.first.tags).to eq([ "pending_signature" ])
      expect(rows.first.billable?).to be(false)
    end

    it "applies both tags when a cancelled contract and an unsigned replacement coexist" do
      student = create(:student, school: school)
      cancelled = create(:contract, school: school, student: student, status: "active",
                                     signature_status: "cancelled")
      replacement = create(:contract, school: school, student: student, status: "active",
                                       signature_status: "pending_signature")

      rows = rows_for([ student ], [ cancelled, replacement ])

      expect(rows.first.contract).to be_nil
      expect(rows.first.tags).to eq([ "cancelled", "pending_signature" ])
      expect(rows.first.billable?).to be(false)
    end

    it "leaves tags empty with a nil contract when the student has no contracts at all" do
      student = create(:student, school: school)

      rows = rows_for([ student ], [])

      expect(rows.first.contract).to be_nil
      expect(rows.first.tags).to eq([])
      expect(rows.first.without_contract?).to be(true)
    end

    it "leaves tags empty with a nil contract when only an ended contract exists" do
      student = create(:student, school: school)
      create(:contract, school: school, student: student, status: "ended", signature_status: "signed")

      rows = rows_for([ student ], student.contracts)

      expect(rows.first.contract).to be_nil
      expect(rows.first.tags).to eq([])
      expect(rows.first.without_contract?).to be(true)
    end

    it "lets a billable signed contract suppress tags even when a cancelled contract also exists" do
      student = create(:student, school: school)
      create(:contract, school: school, student: student, status: "active", signature_status: "cancelled")
      signed = create(:contract, school: school, student: student, status: "active", signature_status: "signed")

      rows = rows_for([ student ], student.contracts)

      expect(rows.first.contract).to eq(signed)
      expect(rows.first.tags).to eq([])
      expect(rows.first.billable?).to be(true)
    end

    it "returns one row per student, in input order, scoped only to that student's own contracts" do
      first_student = create(:student, school: school)
      second_student = create(:student, school: school)
      first_contract = create(:contract, school: school, student: first_student, status: "active",
                                          signature_status: "signed")
      second_contract = create(:contract, school: school, student: second_student, status: "active",
                                           signature_status: "pending_signature")

      rows = rows_for([ second_student, first_student ], [ first_contract, second_contract ])

      expect(rows.map(&:student)).to eq([ second_student, first_student ])

      second_row, first_row = rows
      expect(second_row.contract).to be_nil
      expect(second_row.tags).to eq([ "pending_signature" ])
      expect(first_row.contract).to eq(first_contract)
      expect(first_row.tags).to eq([])
    end

    it "picks among several eligible contracts via the same window/highest-id rule as ExpectedTuitionContracts.pick" do
      student = create(:student, school: school)
      current = create(:contract, school: school, student: student, status: "active",
                                   signature_status: "signed", starts_on: on - 30, ends_on: on + 30)
      future = create(:contract, school: school, student: student, status: "active",
                                  signature_status: "signed", starts_on: on + 60, ends_on: nil)

      rows = rows_for([ student ], [ current, future ])

      expect(rows.first.contract).to eq(current)

      older_without_window = create(:contract, school: school, student: student, status: "active",
                                                 signature_status: "signed", starts_on: on + 90, ends_on: nil)
      newer_without_window = create(:contract, school: school, student: student, status: "active",
                                                signature_status: "signed", starts_on: on + 120, ends_on: nil)

      rows = rows_for([ student ], [ older_without_window, newer_without_window ])

      expect(rows.first.contract).to eq(newer_without_window)
    end
  end
end
