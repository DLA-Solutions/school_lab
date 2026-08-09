# frozen_string_literal: true

require "rails_helper"

RSpec.describe Contracts::SendForSignatureService do
  let(:school) { create(:school) }
  let!(:config) { create(:school_signature_provider, school: school) }
  let(:school_class) { create(:school_class, school: school) }
  let(:student) { create(:student, school: school, school_class: school_class, name: "Pedro Silva") }
  let(:mother) do
    create(:guardian, school: school, name: "Maria Silva", cpf: "12345678909",
                      email: "maria@example.com")
  end
  let(:father) do
    create(:guardian, school: school, name: "João Silva", cpf: "52998224725",
                      email: "joao@example.com")
  end
  let(:contract) do
    create(:contract, school: school, student: student, negotiated_amount_cents: 125_050,
                      due_day: 10, signature_status: "pending_signature")
  end

  def link(guardian, relationship)
    create(:student_guardian, school: school, student: student, guardian: guardian,
                              relationship: relationship)
  end

  describe "who receives it" do
    it "sends to both guardians when the student has two" do
      link(mother, "mother")
      link(father, "father")

      result = described_class.call(contract: contract)

      expect(result).to be_success
      expect(result.data[:signer_links].map(&:email))
        .to match_array(%w[maria@example.com joao@example.com])
    end

    # Not every child has both parents on file.
    it "sends to the single guardian when that is all there is" do
      link(mother, "mother")

      result = described_class.call(contract: contract)

      expect(result).to be_success
      expect(result.data[:signer_links].map(&:email)).to eq(["maria@example.com"])
    end

    it "refuses when the student has no guardian" do
      result = described_class.call(contract: contract)

      expect(result).to be_failure
      expect(result.details[:base].first).to include("responsável")
    end

    # A guardian without an e-mail cannot be reached, and one without a CPF cannot be identified.
    it "names the guardian whose details are incomplete" do
      incomplete = create(:guardian, school: school, name: "Ana Sem Email")
      incomplete.update_column(:email, nil)
      link(incomplete, "mother")

      result = described_class.call(contract: contract)

      expect(result).to be_failure
      expect(result.details[:base].first).to include("Ana Sem Email")
    end
  end

  describe "what it records" do
    before { link(mother, "mother") }

    it "stores the provider's document id and stamps the send" do
      result = described_class.call(contract: contract)

      expect(result).to be_success
      contract.reload
      expect(contract.provider_document_id).to be_present
      expect(contract.signature_provider).to eq("fake")
      expect(contract.signature_status).to eq("pending_signature")
      expect(contract.signature_requested_at).to be_present
      expect(contract.sent_at).to be_present
    end

    # Sending twice would put two agreements in front of the same family.
    it "refuses a contract already sent" do
      described_class.call(contract: contract)

      result = described_class.call(contract: contract.reload)

      expect(result).to be_failure
      expect(result.error_code).to eq(:invalid_state_transition)
    end
  end

  describe "when the school has written its own agreement" do
    before do
      link(mother, "mother")
      link(father, "father")
      school.create_contract_template!(
        body_html: "<h1>{{escola.nome}}</h1>{{responsaveis}}<p>{{contrato.valor}}</p>",
        signature_x: 12.5, signature_y: 88.0, signature_page: 2
      )
    end

    it "sends the filled HTML rather than the built-in PDF" do
      captured = nil
      adapter = instance_double(Gateways::Signature::Fake)
      allow(adapter).to receive(:create_document) do |request|
        captured = request
        Gateways::Signature::ValueObjects::RemoteDocument.new(
          provider_document_id: "doc-1", status: "pending"
        )
      end
      allow(Gateways::Signature::Registry).to receive(:resolve).and_return(adapter)

      expect(described_class.call(contract: contract)).to be_success

      expect(captured.content_type).to eq("text/html")
      expect(captured.filename).to end_with(".html")
      expect(captured.pdf).to include(school.name)
      # Both guardians, with the tuition filled in.
      expect(captured.pdf).to include("Maria Silva", "João Silva", "1.250,50")
    end

    # With HTML the provider decides the pagination, so the position configured on the template
    # is what every signer gets.
    it "uses the position configured on the template" do
      captured = nil
      adapter = instance_double(Gateways::Signature::Fake)
      allow(adapter).to receive(:create_document) do |request|
        captured = request
        Gateways::Signature::ValueObjects::RemoteDocument.new(
          provider_document_id: "doc-1", status: "pending"
        )
      end
      allow(Gateways::Signature::Registry).to receive(:resolve).and_return(adapter)

      described_class.call(contract: contract)

      expect(captured.signers.map(&:positions)).to all(eq([{ x: 12.5, y: 88.0, z: 2 }]))
    end
  end

  describe "when the provider misbehaves" do
    before { link(mother, "mother") }

    def stub_adapter_raising(error)
      adapter = instance_double(Gateways::Signature::Fake)
      allow(adapter).to receive(:create_document).and_raise(error)
      allow(Gateways::Signature::Registry).to receive(:resolve).and_return(adapter)
    end

    # The contract must not claim to be awaiting signature when nothing left the building.
    it "leaves the contract unsent when the provider rejects the request" do
      stub_adapter_raising(Gateways::Signature::ValidationError.new("bad signer"))

      result = described_class.call(contract: contract)

      expect(result).to be_failure
      expect(contract.reload.provider_document_id).to be_nil
    end

    it "reports a rejected token as something the operator must fix" do
      stub_adapter_raising(Gateways::Signature::AuthenticationError.new("nope"))

      result = described_class.call(contract: contract)

      expect(result.error_code).to eq(:validation_error)
      expect(result.details[:base].first).to include("credenciais")
    end

    # A provider outage is worth retrying, and the code says so.
    it "reports an outage as a provider error" do
      stub_adapter_raising(Gateways::Signature::TransientError.new("timeout"))

      result = described_class.call(contract: contract)

      expect(result.error_code).to eq(:provider_error)
    end

    it "tells the operator when the school has no signature integration" do
      config.update!(active: false)

      result = described_class.call(contract: contract)

      expect(result).to be_failure
      expect(result.details[:base].first).to include("integração de assinatura")
    end
  end
end
