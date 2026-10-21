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

  it "marks the contract signed and enqueues guardian access provisioning and the signed notification" do
    expect do
      described_class.call(contract: contract)
    end.to have_enqueued_job(Contracts::ProvisionGuardianAccessJob)
      .with(contract.id, school.id)
      .and have_enqueued_job(Notifications::NotifyContractSignedJob).with(contract.id, school.id)

    expect(contract.reload).to be_signed
    expect(contract.signed_at).to be_present
  end

  it "does not enqueue access provisioning or the notification when the contract was already signed" do
    contract.update!(signature_status: "signed", signed_at: 1.day.ago)
    first_signed_at = contract.signed_at

    expect do
      described_class.call(contract: contract)
    end.not_to have_enqueued_job(Contracts::ProvisionGuardianAccessJob)
    expect do
      described_class.call(contract: contract)
    end.not_to have_enqueued_job(Notifications::NotifyContractSignedJob)

    expect(contract.reload.signed_at).to eq(first_signed_at)
  end

  describe "filing the signed copy into the student's documents" do
    it "enqueues it when the signed file's address was already on record" do
      contract.update!(signed_document_url: "https://autentique.example/doc-1/assinado.pdf")

      expect do
        described_class.call(contract: contract)
      end.to have_enqueued_job(Documents::AttachSignedContractJob).with(contract.id, school.id)
    end

    # The reconcile path records the address right after marking signed, and that is what enqueues.
    it "waits for the address when it is not on record yet" do
      expect do
        described_class.call(contract: contract)
      end.not_to have_enqueued_job(Documents::AttachSignedContractJob)
    end

    it "does not enqueue it again when the contract was already signed" do
      contract.update!(signature_status: "signed", signed_at: 1.day.ago,
                       signed_document_url: "https://autentique.example/doc-1/assinado.pdf")

      expect do
        described_class.call(contract: contract)
      end.not_to have_enqueued_job(Documents::AttachSignedContractJob)
    end
  end
end
