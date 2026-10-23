# frozen_string_literal: true

require "rails_helper"

RSpec.describe Signatures::ReconcilePendingContractsJob do
  include ActiveJob::TestHelper
  let(:school) { create(:school) }
  let!(:config) { create(:school_signature_provider, school: school) }
  let(:school_class) { create(:school_class, school: school) }
  let(:student) { create(:student, school: school, school_class: school_class) }

  def pending_contract(**overrides)
    create(:contract, school: school, student: student, signature_status: "pending_signature",
                      provider_document_id: "doc-1", sent_at: 2.days.ago, **overrides)
  end

  def stub_status(status, signed_file_url: nil)
    document = Gateways::Signature::ValueObjects::RemoteDocument.new(
      provider_document_id: "doc-1", status: status, signed_file_url: signed_file_url
    )
    adapter = instance_double(Gateways::Signature::Fake, fetch_document: document)
    allow(Gateways::Signature::Registry).to receive(:resolve).and_return(adapter)
  end

  # A webhook is a best effort: it can be misconfigured, blocked, or delivered while we are down.
  # Without this sweep a signed contract sits as "aguardando assinatura" until someone notices by
  # hand — which is exactly how the first one was found.
  it "marks a contract the provider already considers signed" do
    contract = pending_contract
    stub_status("signed")

    expect do
      described_class.perform_now
    end.to have_enqueued_job(Contracts::ProvisionGuardianAccessJob)
      .with(contract.id, school.id)

    expect(contract.reload).to be_signed
    expect(contract.signed_at).to be_present
  end

  it "leaves a contract nobody has finished signing alone" do
    contract = pending_contract
    stub_status("pending")

    described_class.perform_now

    expect(contract.reload.signature_status).to eq("pending_signature")
  end

  it "does not ask about a contract that never reached a provider" do
    pending_contract(provider_document_id: nil)
    expect(Gateways::Signature::Registry).not_to receive(:resolve)

    described_class.perform_now
  end

  # Re-asking the provider every morning about documents nobody is going to sign is waste.
  it "does not ask about a contract sent long ago" do
    pending_contract(sent_at: 6.months.ago)
    expect(Gateways::Signature::Registry).not_to receive(:resolve)

    described_class.perform_now
  end

  it "keeps the original signature date when it runs again" do
    contract = pending_contract
    stub_status("signed")

    described_class.perform_now
    first = contract.reload.signed_at

    expect do
      described_class.perform_now
    end.not_to have_enqueued_job(Contracts::ProvisionGuardianAccessJob)

    expect(contract.reload.signed_at).to eq(first)
  end

  it "records where the signed file lives, so the listing can link to it" do
    contract = pending_contract
    stub_status("signed", signed_file_url: "https://autentique.example/doc-1/assinado.pdf")

    described_class.perform_now

    expect(contract.reload.signed_document_url).to eq("https://autentique.example/doc-1/assinado.pdf")
  end

  # Contracts signed before that address was being recorded have nothing for the listing to link
  # to; they are worth one more ask.
  it "picks up a signed contract that is missing its signed file" do
    contract = pending_contract(signature_status: "signed", signed_at: 1.day.ago)
    stub_status("signed", signed_file_url: "https://autentique.example/doc-1/assinado.pdf")

    described_class.perform_now

    expect(contract.reload.signed_document_url).to be_present
  end

  it "leaves a signed contract alone once its file is known" do
    pending_contract(signature_status: "signed", signed_at: 1.day.ago,
                     signed_document_url: "https://autentique.example/doc-1/assinado.pdf")
    expect(Gateways::Signature::Registry).not_to receive(:resolve)

    described_class.perform_now
  end

  # One school's unreachable provider must not stop the sweep for everyone else.
  it "carries on past a school whose provider fails" do
    broken = pending_contract
    other_school = create(:school)
    create(:school_signature_provider, school: other_school)
    other = create(:contract, school: other_school,
                              student: create(:student, school: other_school,
                                                        school_class: create(:school_class, school: other_school)),
                              signature_status: "pending_signature",
                              provider_document_id: "doc-2", sent_at: 1.day.ago)

    allow(Gateways::Signature::Registry).to receive(:resolve) do |school:, **|
      if school.id == broken.school_id
        raise Gateways::Signature::TransientError, "Autentique unreachable"
      end

      instance_double(
        Gateways::Signature::Fake,
        fetch_document: Gateways::Signature::ValueObjects::RemoteDocument.new(
          provider_document_id: "doc-2", status: "signed"
        )
      )
    end

    described_class.perform_now

    expect(broken.reload.signature_status).to eq("pending_signature")
    expect(other.reload).to be_signed
  end

  # Contracts signed before the signed copy was filed into "Meus documentos" have the address on
  # record but no document, and nothing else would ever file them.
  describe "filing signed contracts that never got their document" do
    let(:file_url) { "https://autentique.example/doc-1/assinado.pdf" }

    def signed_contract(**overrides)
      create(:contract, school: school, student: student, signature_status: "signed", signed_at: 1.day.ago,
                        provider_document_id: "doc-1", sent_at: 2.days.ago, signed_document_url: file_url,
                        **overrides)
    end

    it "enqueues the filing for a signed contract that has its file on record but no document" do
      contract = signed_contract

      expect do
        described_class.perform_now
      end.to have_enqueued_job(Documents::AttachSignedContractJob).with(contract.id, school.id).once
    end

    it "does not look back only 90 days for them" do
      contract = signed_contract(sent_at: 1.year.ago)

      expect do
        described_class.perform_now
      end.to have_enqueued_job(Documents::AttachSignedContractJob).with(contract.id, school.id)
    end

    it "skips a contract that already has its document" do
      contract = signed_contract
      create(:document, :approved, school: school, documentable: student, contract: contract,
                                   document_type: Document::SIGNED_CONTRACT_TYPE)

      expect do
        described_class.perform_now
      end.not_to have_enqueued_job(Documents::AttachSignedContractJob)
    end

    it "does not refile a document staff discarded" do
      contract = signed_contract
      create(:document, :approved, school: school, documentable: student, contract: contract,
                                   document_type: Document::SIGNED_CONTRACT_TYPE).discard

      expect do
        described_class.perform_now
      end.not_to have_enqueued_job(Documents::AttachSignedContractJob)
    end

    it "ignores a contract that is not signed or is discarded" do
      signed_contract(signature_status: "pending_signature", signed_at: nil, provider_document_id: nil)
      signed_contract.discard

      expect do
        described_class.perform_now
      end.not_to have_enqueued_job(Documents::AttachSignedContractJob)
    end

    it "files each school's contract under its own school" do
      other_school = create(:school)
      other_student = create(:student, school: other_school, school_class: create(:school_class, school: other_school))
      theirs = create(:contract, school: other_school, student: other_student, signature_status: "signed",
                                 signed_at: 1.day.ago, provider_document_id: "doc-9", signed_document_url: file_url)
      mine = signed_contract

      expect do
        described_class.perform_now
      end.to have_enqueued_job(Documents::AttachSignedContractJob).with(mine.id, school.id)
         .and have_enqueued_job(Documents::AttachSignedContractJob).with(theirs.id, other_school.id)
    end

    it "ends with exactly one document however many times the sweep runs" do
      contract = signed_contract
      stub_request(:get, file_url).to_return(status: 200, body: "%PDF-1.4 signed bytes")

      2.times { perform_enqueued_jobs { described_class.perform_now } }

      expect(Document.where(contract_id: contract.id).count).to eq(1)
    end
  end
end
