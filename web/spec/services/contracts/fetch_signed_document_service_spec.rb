# frozen_string_literal: true

require "rails_helper"

RSpec.describe Contracts::FetchSignedDocumentService do
  let(:school) { create(:school) }
  # The Autentique trait, because the token is exactly what this service is about.
  let!(:config) { create(:school_signature_provider, :autentique, school: school) }
  let(:student) { create(:student, school: school, name: "Mariana Sales") }
  let(:document_url) { "https://api.autentique.com.br/documentos/abc123/assinado.pdf" }
  let(:contract) do
    create(:contract, school: school, student: student, signature_status: "signed",
                      signed_document_url: document_url)
  end

  def stub_provider(status: 200, body: "%PDF-1.4 signed bytes")
    stub_request(:get, document_url)
      .to_return(status: status, body: body, headers: { "Content-Type" => "application/pdf" })
  end

  it "returns the bytes the provider served" do
    stub_provider

    result = described_class.call(contract: contract)

    expect(result).to be_success
    expect(result.data.fetch(:pdf)).to eq("%PDF-1.4 signed bytes")
  end

  # The token can sign documents on the school's behalf, so it is sent from here and never
  # reaches a browser. Losing this is what a plain link to the provider's URL would mean.
  it "authenticates with the school's own API token" do
    stub_provider

    described_class.call(contract: contract)

    expect(
      a_request(:get, document_url)
        .with(headers: { "Authorization" => "Bearer #{config.api_token}" })
    ).to have_been_made
  end

  it "names the file after the student, which is how a school looks for one later" do
    stub_provider

    expect(described_class.call(contract: contract).data.fetch(:filename))
      .to eq("contrato-assinado-mariana-sales.pdf")
  end

  describe "what it refuses" do
    it "refuses a contract that has not been signed" do
      unsigned = create(:contract, school: school, student: student,
                                   signature_status: "pending_signature")

      result = described_class.call(contract: unsigned)

      expect(result).to be_failure
      expect(result.error_code).to eq(:validation_error)
    end

    # Signed, but the provider's file has not been reconciled onto the record yet — a real gap
    # of minutes, and a different thing from a contract nobody signed.
    it "reports a signed contract whose file is not on record yet as missing" do
      pending_file = create(:contract, school: school, student: student,
                                       signature_status: "signed", signed_document_url: nil)

      result = described_class.call(contract: pending_file)

      expect(result).to be_failure
      expect(result.error_code).to eq(:not_found)
    end
  end

  describe "when the provider does not answer with the file" do
    it "reports a provider error rather than handing back an error page" do
      stub_provider(status: 403, body: "<html>forbidden</html>")

      result = described_class.call(contract: contract)

      expect(result).to be_failure
      expect(result.error_code).to eq(:provider_error)
    end

    it "reports a connection failure as a provider error" do
      stub_request(:get, document_url).to_timeout

      result = described_class.call(contract: contract)

      expect(result).to be_failure
      expect(result.error_code).to eq(:provider_error)
    end

    it "reports a school with no signature configuration instead of raising" do
      config.update!(active: false)

      result = described_class.call(contract: contract)

      expect(result).to be_failure
      expect(result.error_code).to eq(:provider_error)
    end
  end
end
