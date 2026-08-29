# frozen_string_literal: true

require "rails_helper"

RSpec.describe Contracts::ProvisionGuardianAccessJob, type: :job do
  let(:school) { create(:school) }
  let(:student) { create(:student, school: school) }
  let(:payer) { create(:guardian, school: school, email: "payer@example.com") }
  let!(:link) { create(:student_guardian, school: school, student: student, guardian: payer) }
  let(:contract) do
    create(:contract, school: school, student: student, payer_guardian: payer,
                      signature_status: "signed", signed_at: Time.current)
  end

  it "provisions access for the contract payer through the service" do
    expect(Contracts::ProvisionGuardianAccessService).to receive(:call)
      .with(contract: contract)
      .and_call_original

    described_class.perform_now(contract.id, school.id)

    expect(payer.reload.user).to be_present
  end

  it "discards when the contract belongs to another school" do
    other_school = create(:school)

    expect(Contracts::ProvisionGuardianAccessService).not_to receive(:call)

    described_class.perform_now(contract.id, other_school.id)
  end
end
