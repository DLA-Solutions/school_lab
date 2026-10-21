# frozen_string_literal: true

require "rails_helper"

RSpec.describe Documents::AttachSignedContractService do
  let(:school) { create(:school) }
  let!(:config) { create(:school_signature_provider, :autentique, school: school) }
  let(:student) { create(:student, school: school, name: "Mariana Sales") }
  let(:document_url) { "https://api.autentique.com.br/documentos/abc123/assinado.pdf" }
  let(:contract) do
    create(:contract, school: school, student: student, signature_status: "signed",
                      signed_at: 1.hour.ago, signed_document_url: document_url)
  end

  def stub_provider(status: 200, body: "%PDF-1.4 signed bytes")
    stub_request(:get, document_url)
      .to_return(status: status, body: body, headers: { "Content-Type" => "application/pdf" })
  end

  describe "a signed contract whose file is on record" do
    before { stub_provider }

    it "files one approved, system-generated document on the student" do
      result = nil
      expect { result = described_class.call(contract: contract) }.to change(Document, :count).by(1)

      document = result.data
      expect(result).to be_success
      expect(document).to be_persisted
      expect(document.school).to eq(school)
      expect(document.documentable).to eq(student)
      expect(document.contract).to eq(contract)
      expect(document.document_type).to eq("signed_contract")
      expect(document.status).to eq("approved")
      expect(document.uploaded_by).to be_nil
      expect(document.reviewed_at).to be_present
    end

    it "attaches the provider's bytes as a PDF named after the student" do
      document = described_class.call(contract: contract).data

      expect(document.file).to be_attached
      expect(document.file.download).to eq("%PDF-1.4 signed bytes")
      expect(document.file.content_type).to eq("application/pdf")
      expect(document.file.filename.to_s).to eq("contrato-assinado-mariana-sales.pdf")
    end

    it "does nothing the second time and does not call the provider again" do
      described_class.call(contract: contract)

      result = nil
      expect { result = described_class.call(contract: contract) }.not_to change(Document, :count)

      expect(result).to be_success
      expect(result.data).to eq(contract.signed_document)
      expect(a_request(:get, document_url)).to have_been_made.once
    end

    it "leaves a document staff discarded alone instead of filing it again" do
      document = described_class.call(contract: contract).data
      document.discard

      expect { described_class.call(contract: contract) }.not_to change(Document, :count)
      expect(document.reload).to be_discarded
    end
  end

  describe "when there is nothing to file yet" do
    it "is a no-op for a contract that is not signed" do
      pending = create(:contract, school: school, student: student, signature_status: "pending_signature",
                                  signed_document_url: document_url)

      result = nil
      expect { result = described_class.call(contract: pending) }.not_to change(Document, :count)

      expect(result).to be_success
      expect(a_request(:get, document_url)).not_to have_been_made
    end

    it "is a no-op while the signed file's address is not on record" do
      no_url = create(:contract, school: school, student: student, signature_status: "signed",
                                 signed_document_url: nil)

      result = nil
      expect { result = described_class.call(contract: no_url) }.not_to change(Document, :count)

      expect(result).to be_success
    end

    it "is a no-op for a discarded contract" do
      contract.discard

      expect { described_class.call(contract: contract) }.not_to change(Document, :count)
    end
  end

  describe "when the provider does not hand over the file" do
    it "fails with a provider error and files nothing" do
      stub_provider(status: 403, body: "<html>forbidden</html>")

      result = nil
      expect { result = described_class.call(contract: contract) }.not_to change(Document, :count)

      expect(result).to be_failure
      expect(result.error_code).to eq(:provider_error)
    end

    it "fails on a timeout" do
      stub_request(:get, document_url).to_timeout

      result = described_class.call(contract: contract)

      expect(result).to be_failure
      expect(result.error_code).to eq(:provider_error)
      expect(Document.where(contract_id: contract.id)).to be_empty
    end

    it "refuses a 200 that is not a PDF" do
      stub_provider(body: "<html>login</html>")

      result = nil
      expect { result = described_class.call(contract: contract) }.not_to change(Document, :count)

      expect(result).to be_failure
      expect(result.error_code).to eq(:provider_error)
    end

    it "can be retried successfully after a failure" do
      stub_provider(status: 500, body: "boom")
      described_class.call(contract: contract)

      WebMock.reset!
      stub_provider
      result = described_class.call(contract: contract)

      expect(result).to be_success
      expect(Document.where(contract_id: contract.id).count).to eq(1)
    end
  end
end
