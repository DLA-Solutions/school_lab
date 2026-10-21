# frozen_string_literal: true

require "rails_helper"

RSpec.describe Contracts::ReconcileSignatureService do
  include ActiveJob::TestHelper

  let(:school) { create(:school) }
  let!(:config) { create(:school_signature_provider, school: school) }
  let(:student) { create(:student, school: school) }
  let(:file_url) { "https://autentique.example/doc-1/assinado.pdf" }
  let(:contract) do
    create(:contract, school: school, student: student, signature_status: "pending_signature",
                      provider_document_id: "doc-1", sent_at: 1.day.ago)
  end

  def stub_status(status, signed_file_url: nil)
    document = Gateways::Signature::ValueObjects::RemoteDocument.new(
      provider_document_id: "doc-1", status: status, signed_file_url: signed_file_url
    )
    adapter = instance_double(Gateways::Signature::Fake, fetch_document: document)
    allow(Gateways::Signature::Registry).to receive(:resolve).and_return(adapter)
  end

  describe "filing the signed copy into the student's documents" do
    it "enqueues it once the signed file's address is recorded" do
      stub_status("signed", signed_file_url: file_url)

      expect do
        described_class.call(contract: contract)
      end.to have_enqueued_job(Documents::AttachSignedContractJob).with(contract.id, school.id).once

      expect(contract.reload.signed_document_url).to eq(file_url)
    end

    it "enqueues it for a contract signed earlier whose address was only just learned" do
      contract.update!(signature_status: "signed", signed_at: 1.day.ago)
      stub_status("signed", signed_file_url: file_url)

      expect do
        described_class.call(contract: contract)
      end.to have_enqueued_job(Documents::AttachSignedContractJob).with(contract.id, school.id)
    end

    it "does not enqueue it when the provider has no signed file yet" do
      stub_status("signed", signed_file_url: nil)

      expect do
        described_class.call(contract: contract)
      end.not_to have_enqueued_job(Documents::AttachSignedContractJob)
    end

    it "does not enqueue it for a contract nobody has signed" do
      stub_status("pending")

      expect do
        described_class.call(contract: contract)
      end.not_to have_enqueued_job(Documents::AttachSignedContractJob)
    end

    it "does not enqueue it again on replay of an already processed contract" do
      stub_status("signed", signed_file_url: file_url)
      described_class.call(contract: contract)

      expect do
        described_class.call(contract: contract.reload)
      end.not_to have_enqueued_job(Documents::AttachSignedContractJob)
    end
  end
end
