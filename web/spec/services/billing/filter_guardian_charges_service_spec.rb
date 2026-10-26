# frozen_string_literal: true

require "rails_helper"

RSpec.describe Billing::FilterGuardianChargesService do
  subject(:result) { described_class.call(scope: Charge.all, params: params) }

  let(:school) { create(:school) }
  let(:guardian) { create(:guardian, school: school) }
  let(:contract) { create(:contract, school: school) }
  let!(:pending_march) do
    create(:charge, school: school, contract: contract, guardian: guardian, due_date: Date.new(2026, 3, 10))
  end
  let!(:overdue_april) do
    create(:charge, :overdue, school: school, contract: contract, guardian: guardian, due_date: Date.new(2026, 4, 30))
  end
  let!(:paid_may) do
    create(:charge, :paid, school: school, contract: contract, guardian: guardian, due_date: Date.new(2026, 5, 1))
  end
  let!(:cancelled_june) do
    create(:charge, :cancelled, school: school, contract: contract, guardian: guardian, due_date: Date.new(2026, 6, 5))
  end

  def ids
    result.data.map(&:id)
  end

  context "without status (legacy open list)" do
    let(:params) { {} }

    it "returns pending and overdue charges, oldest due date first" do
      expect(result).to be_success
      expect(ids).to eq([ pending_march.id, overdue_april.id ])
    end
  end

  context "with status=all" do
    let(:params) { { status: "all" } }

    it "returns every non-cancelled status, newest due date first" do
      expect(ids).to eq([ paid_may.id, overdue_april.id, pending_march.id ])
    end
  end

  context "with explicit statuses" do
    it "accepts a comma separated list" do
      filtered = described_class.call(scope: Charge.all, params: { status: "paid,overdue" })

      expect(filtered.data.map(&:id)).to eq([ paid_may.id, overdue_april.id ])
    end

    it "accepts an array" do
      filtered = described_class.call(scope: Charge.all, params: { status: %w[pending] })

      expect(filtered.data.map(&:id)).to eq([ pending_march.id ])
    end

    it "never returns cancelled charges" do
      filtered = described_class.call(scope: Charge.all, params: { status: "cancelled" })

      expect(filtered).to be_failure
    end

    it "rejects unknown values" do
      filtered = described_class.call(scope: Charge.all, params: { status: "paid,bogus" })

      expect(filtered.error_code).to eq(:validation_error)
      expect(filtered.details).to include(:status)
    end
  end

  context "with month and year" do
    let(:params) { { status: "all", month: "4", year: "2026" } }

    it "keeps due dates inside that calendar month, bounds included" do
      expect(ids).to eq([ overdue_april.id ])
    end
  end

  context "with month and year at a month boundary" do
    let(:params) { { status: "all", month: "05", year: "2026" } }

    it "includes the first day of the month" do
      expect(ids).to eq([ paid_may.id ])
    end
  end

  context "with year only" do
    let(:params) { { status: "all", year: "2026" } }

    it "keeps due dates in that calendar year" do
      expect(ids).to eq([ paid_may.id, overdue_april.id, pending_march.id ])
    end
  end

  context "with from and to" do
    let(:params) { { status: "all", from: "2026-04-30", to: "2026-05-01" } }

    it "is inclusive on both ends" do
      expect(ids).to eq([ paid_may.id, overdue_april.id ])
    end
  end

  context "with only from" do
    let(:params) { { status: "all", from: "2026-04-30" } }

    it "is open ended" do
      expect(ids).to eq([ paid_may.id, overdue_april.id ])
    end
  end

  context "with only to" do
    let(:params) { { status: "all", to: "2026-03-10" } }

    it "is open at the start" do
      expect(ids).to eq([ pending_march.id ])
    end
  end

  context "with order=asc" do
    let(:params) { { status: "all", order: "asc" } }

    it "reverses the unified default" do
      expect(ids).to eq([ pending_march.id, overdue_april.id, paid_may.id ])
    end
  end

  describe "invalid input" do
    {
      { month: "13", year: "2026" } => :month,
      { month: "0", year: "2026" } => :month,
      { month: "abc", year: "2026" } => :month,
      { month: "4" } => :year,
      { year: "26" } => :year,
      { year: "20266" } => :year,
      { from: "2026-13-40" } => :from,
      { from: "10/04/2026" } => :from,
      { to: "tomorrow" } => :to,
      { from: "2026-05-02", to: "2026-05-01" } => :to,
      { month: "4", year: "2026", from: "2026-04-01" } => :from,
      { month: "4", year: "2026", to: "2026-04-30" } => :to,
      { order: "sideways" } => :order
    }.each do |input, key|
      it "reports #{input.inspect} under #{key}" do
        filtered = described_class.call(scope: Charge.all, params: input)

        expect(filtered).to be_failure
        expect(filtered.error_code).to eq(:validation_error)
        expect(filtered.details.keys).to include(key)
        expect(filtered.details[key]).to all(be_a(String))
      end
    end

    it "reports every problem at once" do
      filtered = described_class.call(scope: Charge.all, params: { status: "x", month: "99", year: "2026" })

      expect(filtered.details.keys).to contain_exactly(:status, :month)
    end
  end
end
