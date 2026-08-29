# frozen_string_literal: true

require "rails_helper"

RSpec.describe Contracts::MarkSignedService do
  include ActiveJob::TestHelper

  let(:school) { create(:school) }
  let(:student) { create(:student, school: school) }
  let(:payer) { create(:guardian, school: school, email: "payer@example.com") }
  let!(:link) { create(:student_guardian, school: school, student: student, guardian: payer) }
  let(:contract) do
    create(:contract, school: school, student: student, payer_guardian: payer,
                      signature_status: "pending_signature")
  end

  it "marks the contract signed and enqueues guardian access provisioning" do
    expect do
      described_class.call(contract: contract)
    end.to have_enqueued_job(Contracts::ProvisionGuardianAccessJob)
      .with(contract.id, school.id)

    expect(contract.reload).to be_signed
    expect(contract.signed_at).to be_present
  end

  it "does not enqueue access provisioning when the contract was already signed" do
    contract.update!(signature_status: "signed", signed_at: 1.day.ago)
    first_signed_at = contract.signed_at

    expect do
      described_class.call(contract: contract)
    end.not_to have_enqueued_job(Contracts::ProvisionGuardianAccessJob)

    expect(contract.reload.signed_at).to eq(first_signed_at)
  end
end
