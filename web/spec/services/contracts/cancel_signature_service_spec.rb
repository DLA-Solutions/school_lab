# frozen_string_literal: true

require "rails_helper"

RSpec.describe Contracts::CancelSignatureService do
  let(:school) { create(:school) }
  let!(:config) { create(:school_signature_provider, school: school) }
  let(:student) { create(:student, school: school, name: "Mariana Sales") }
  let(:contract) do
    create(:contract, school: school, student: student, signature_status: "pending_signature",
                      provider_document_id: "doc-abc-123")
  end

  let(:adapter) { instance_double(Gateways::Signature::Fake) }

  before do
    allow(Gateways::Signature::Registry).to receive(:resolve).and_return(adapter)
    allow(adapter).to receive(:cancel_document).and_return(true)
  end

  it "records the contract as cancelled" do
    result = described_class.call(contract: contract)

    expect(result).to be_success
    expect(contract.reload.signature_status).to eq("cancelled")
    expect(contract.signature_cancelled_at).to be_present
  end

  it "withdraws the document from the provider" do
    described_class.call(contract: contract)

    expect(adapter).to have_received(:cancel_document)
      .with(provider_document_id: "doc-abc-123")
  end

  # The contract is on record as cancelled, not deleted: when the reason was a wrong figure, it is
  # the context for the corrected contract that follows it.
  it "keeps the contract on the books" do
    contract # created before the block, so the count reflects the cancellation alone

    expect { described_class.call(contract: contract) }.not_to change(Contract, :count)
    expect(contract.reload).not_to be_discarded
  end

  # A send that never reached the provider leaves nothing to withdraw.
  it "cancels a contract that was never dispatched without calling the provider" do
    never_sent = create(:contract, school: school, student: student,
                                   signature_status: "pending_signature", provider_document_id: nil)

    result = described_class.call(contract: never_sent)

    expect(result).to be_success
    expect(never_sent.reload.signature_status).to eq("cancelled")
    expect(adapter).not_to have_received(:cancel_document)
  end

  describe "when the provider cannot withdraw it" do
    before do
      allow(adapter).to receive(:cancel_document)
        .and_raise(Gateways::Signature::TransientError, "provider down")
    end

    # The one outcome that must not happen: a contract dead on our side whose link is still out
    # there collecting signatures. The family would sign an agreement nobody is expecting.
    it "leaves the contract awaiting signature rather than lying about it" do
      result = described_class.call(contract: contract)

      expect(result).to be_failure
      expect(result.error_code).to eq(:provider_error)
      expect(contract.reload.signature_status).to eq("pending_signature")
      expect(contract.signature_cancelled_at).to be_nil
    end

    it "reports a school with no signature configuration the same way" do
      allow(Gateways::Signature::Registry).to receive(:active_config)
        .and_raise(Gateways::Signature::Registry::MissingConfigurationError)

      expect(described_class.call(contract: contract)).to be_failure
      expect(contract.reload.signature_status).to eq("pending_signature")
    end
  end

  describe "what it refuses" do
    # A signed contract is an agreement in force. Undoing it is a rescission, and Autentique only
    # bins the file anyway — the signatures stand, so a cancel button here would be a fiction.
    it "refuses a contract the family already signed" do
      signed = create(:contract, school: school, student: student, signature_status: "signed",
                                 provider_document_id: "doc-signed")

      result = described_class.call(contract: signed)

      expect(result).to be_failure
      expect(result.error_code).to eq(:validation_error)
      expect(signed.reload.signature_status).to eq("signed")
      expect(adapter).not_to have_received(:cancel_document)
    end

    it "refuses one that was already cancelled" do
      contract.update!(signature_status: "cancelled", signature_cancelled_at: Time.current)

      expect(described_class.call(contract: contract)).to be_failure
    end
  end
end
