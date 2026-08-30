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
end
