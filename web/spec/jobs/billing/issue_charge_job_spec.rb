# frozen_string_literal: true

require "rails_helper"

RSpec.describe Billing::IssueChargeJob, type: :job do
  include ActiveJob::TestHelper

  let(:school) { create(:school) }
  let!(:provider_config) { create(:school_payment_provider, school: school, provider: "fake") }
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

  it "retries transient provider failures and leaves the issuance pending" do
    allow(adapter).to receive(:issue).and_raise(Gateways::BankSlip::TransientError, "Provider timeout")

    expect { described_class.perform_now(charge.id, school.id) }
      .to change { SolidQueue::Job.where(class_name: described_class.name).count }.by(1)

    expect(charge.reload.current_issuance.status).to eq("pending")
  end

  it "does not retry permanent provider failures and records them on the issuance" do
    allow(adapter).to receive(:issue).and_raise(
      Gateways::BankSlip::AuthenticationError, "Provider authentication failed (401)"
    )

    expect { described_class.perform_now(charge.id, school.id) }
      .not_to change { SolidQueue::Job.where(class_name: described_class.name).count }

    issuance = charge.reload.current_issuance
    expect(issuance.status).to eq("failed")
    expect(issuance.last_error).to be_present
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
