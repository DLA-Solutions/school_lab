# frozen_string_literal: true

require "rails_helper"

RSpec.describe Contracts::ProvisionGuardianAccessService do
  let(:school) { create(:school) }
  let(:student) { create(:student, school: school) }
  let(:payer) { create(:guardian, school: school, email: "payer@example.com") }
  let!(:link) { create(:student_guardian, school: school, student: student, guardian: payer) }
  let(:contract) do
    create(:contract, school: school, student: student, payer_guardian: payer,
                      signature_status: "signed", signed_at: Time.current)
  end

  before { ActionMailer::Base.deliveries.clear }

  it "sends access to the payer guardian" do
    expect(People::SendGuardianAccessService).to receive(:call)
      .with(guardian: payer)
      .and_call_original

    described_class.call(contract: contract)

    expect(school.memberships.where(role: "guardian").count).to eq(1)
  end

  it "falls back to the first signer when payer_guardian is not set" do
    contract.update!(payer_guardian: nil)

    expect(People::SendGuardianAccessService).to receive(:call)
      .with(guardian: payer)
      .and_call_original

    described_class.call(contract: contract)
  end

  it "skips when the payer already has an active guardian membership" do
    described_class.call(contract: contract)
    membership = school.memberships.guardian.last
    membership.user.update!(password: "SenhaAtual123!", password_confirmation: "SenhaAtual123!")
    membership.update!(status: "active")
    ActionMailer::Base.deliveries.clear

    expect(People::SendGuardianAccessService).not_to receive(:call)

    result = described_class.call(contract: contract)

    expect(result).to be_success
    expect(result.data[:skipped]).to be(true)
    expect(result.data[:reason]).to eq(:already_has_access)
  end

  it "succeeds without sending when no payer can be resolved" do
    contract.update!(payer_guardian: nil)
    link.discard!

    expect(People::SendGuardianAccessService).not_to receive(:call)

    result = described_class.call(contract: contract)

    expect(result).to be_success
    expect(result.data[:reason]).to eq(:no_payer)
  end
end
