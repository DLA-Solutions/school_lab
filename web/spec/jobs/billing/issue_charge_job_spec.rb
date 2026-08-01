# frozen_string_literal: true

require "rails_helper"

RSpec.describe Billing::IssueChargeJob, type: :job do
  include ActiveJob::TestHelper

  let(:school) { create(:school) }
  let(:guardian) { create(:guardian, school: school) }
  let(:charge) do
    create(:charge, school: school, guardian: guardian, due_date: Date.new(2026, 12, 10))
  end
  let(:adapter) { instance_double(Gateways::BankSlip::Fake) }
  let(:issuance_result) do
    Gateways::BankSlip::ValueObjects::Issuance.new(
      provider_invoice_id: "fake-invoice-job",
      boleto_url: "https://fake.test/boleto",
      digitable_line: "23793.38128 60000.000003 00000.000400 1 93480000085000",
      barcode: "23793934800000850003381286000000000000400000",
      our_number: "00000004",
      pix_emv: "000201pix",
      status: "open"
    )
  end

  before do
    allow(Gateways::BankSlip::Registry).to receive(:resolve).and_return(adapter)
    allow(adapter).to receive(:issue).and_return(issuance_result)
  end

  it "issues the charge through the service" do
    described_class.perform_now(charge.id, school.id)

    expect(charge.reload.provider_invoice_id).to eq("fake-invoice-job")
  end

  it "does not persist jobs when charge generation rolls back" do
    guardian = create(:guardian, school: school)
    student = create(:student, school: school)
    billing_plan = create(:billing_plan, school: school, base_amount_cents: 90_000)
    contract = create(:contract, school: school, student: student, billing_plan: billing_plan,
                                 negotiated_amount_cents: 90_000, due_day: 10, status: "active")
    create(:student_guardian, school: school, student: student, guardian: guardian, primary_guardian: true)

    allow(Billing::IssueChargeJob).to receive(:perform_later).and_raise(ActiveRecord::Rollback)

    expect do
      Billing::GenerateChargesService.call(school: school, billing_period: "2026-12")
    end.not_to change(Charge, :count)

    expect(SolidQueue::Job.where(class_name: Billing::IssueChargeJob.name)).to be_empty
  end
end
