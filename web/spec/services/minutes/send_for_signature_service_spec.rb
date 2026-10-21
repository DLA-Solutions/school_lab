# frozen_string_literal: true

require "rails_helper"

RSpec.describe Minutes::SendForSignatureService do
  let(:school) { create(:school) }
  let!(:config) { create(:school_signature_provider, school: school) }
  let(:entry) { create(:minutes_entry, school: school, title: "Reunião de abril") }
  let(:adapter) { instance_double(Gateways::Signature::Fake) }

  def add_signer(name: "Ana Souza", **attributes)
    create(:minutes_participant, :signer, school: school, minutes_entry: entry, name: name, **attributes)
  end

  def stub_adapter(result: nil, error: nil)
    allow(Gateways::Signature::Registry).to receive(:resolve).and_return(adapter)
    expectation = allow(adapter).to receive(:create_document)
    error ? expectation.and_raise(error) : expectation.and_return(result)
  end

  def remote_document
    Gateways::Signature::ValueObjects::RemoteDocument.new(
      provider_document_id: "doc-42", status: "pending",
      signer_links: [ Gateways::Signature::ValueObjects::SignerLink.new(email: "a@example.com", url: "https://x") ]
    )
  end

  describe "a valid draft" do
    before do
      add_signer(name: "Ana Souza")
      add_signer(name: "Beto Lima")
      create(:minutes_participant, school: school, minutes_entry: entry, name: "Observer")
    end

    it "marks the entry pending only after the provider accepted it" do
      result = described_class.call(entry: entry)

      expect(result).to be_success
      expect(entry.reload).to be_pending_signature
      expect(entry).to have_attributes(
        signature_provider: "fake", provider_document_id: start_with("fake-doc-"),
        signature_requested_at: be_present
      )
      expect(result.data[:signer_links].map(&:email)).to match_array(entry.signers.map(&:email))
    end

    it "sends the rendered PDF with one signer per flagged participant and a position for each" do
      stub_adapter(result: remote_document)

      described_class.call(entry: entry)

      expect(adapter).to have_received(:create_document) do |request|
        expect(request.content_type).to eq("application/pdf")
        expect(request.pdf).to start_with("%PDF")
        expect(request.name).to eq("Ata de reunião — Reunião de abril")
        expect(request.signers.map(&:name)).to eq([ "Ana Souza", "Beto Lima" ])
        expect(request.signers).to all(have_attributes(cpf: be_present, email: be_present))
        expect(request.signers.flat_map(&:positions).size).to eq(2)
        expect(request.signers.first.positions.first).to include(:x, :y, :z)
      end
    end
  end

  describe "refusals that send nothing" do
    it "refuses an entry that is not a draft" do
      entry.request_signature!

      result = described_class.call(entry: entry)

      expect(result.error_code).to eq(:invalid_state_transition)
    end

    it "requires at least one signer" do
      create(:minutes_participant, school: school, minutes_entry: entry)

      result = described_class.call(entry: entry)

      expect(result.error_code).to eq(:validation_error)
      expect(result.details[:base].first).to include("signatário").or include("signer")
      expect(entry.reload).to be_draft
    end

    it "names every signer missing an e-mail or CPF" do
      add_signer(name: "Fulana Pronta")
      create(:minutes_participant, school: school, minutes_entry: entry, name: "No Email", signs: true,
                                   cpf: "52998224725")
      create(:minutes_participant, school: school, minutes_entry: entry, name: "No Cpf", signs: true,
                                   email: "x@example.com")
      stub_adapter(result: remote_document)

      result = described_class.call(entry: entry)

      expect(result.error_code).to eq(:validation_error)
      expect(result.details[:base].first).to include("No Email", "No Cpf")
      expect(result.details[:base].first).not_to include("Fulana Pronta")
      expect(adapter).not_to have_received(:create_document)
      expect(entry.reload).to be_draft
    end

    it "fails when the body has characters the PDF font cannot draw" do
      add_signer
      entry.update_columns(body: "<p>漢字</p>")

      result = described_class.call(entry: entry)

      expect(result.error_code).to eq(:validation_error)
      expect(entry.reload).to be_draft
    end
  end

  describe "provider failures leave the entry a draft" do
    before { add_signer }

    {
      Gateways::Signature::AuthenticationError => [ :validation_error, nil ],
      Gateways::Signature::TransientError => [ :provider_error, nil ],
      Gateways::Signature::ValidationError => [ :validation_error, "refused" ]
    }.each do |error_class, (code, message)|
      it "maps #{error_class.name.demodulize} to #{code}" do
        stub_adapter(error: error_class.new(message || "boom"))

        result = described_class.call(entry: entry)

        expect(result.error_code).to eq(code)
        expect(entry.reload).to be_draft
        expect(entry.provider_document_id).to be_nil
      end
    end

    it "maps a missing configuration to a validation error" do
      config.destroy

      result = described_class.call(entry: entry)

      expect(result.error_code).to eq(:validation_error)
      expect(entry.reload).to be_draft
    end
  end
end
