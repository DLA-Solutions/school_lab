# frozen_string_literal: true

require "rails_helper"

RSpec.describe Minutes::AttachSignedPdfService do
  let(:school) { create(:school) }
  let!(:config) { create(:school_signature_provider, :autentique, school: school) }
  let(:url) { "https://api.autentique.com.br/documentos/abc123/assinado.pdf" }
  let(:entry) do
    create(:minutes_entry, :signed, school: school, title: "Ata final", signed_document_url: url)
  end

  def stub_provider(status: 200, body: "%PDF-1.4 signed bytes")
    stub_request(:get, url).with(headers: { "Authorization" => "Bearer autentique-test-token" })
                           .to_return(status: status, body: body)
  end

  it "stores the provider's bytes on the entry with the school's token" do
    stub_provider

    result = described_class.call(entry: entry)

    expect(result).to be_success
    expect(entry.reload.pdf).to be_attached
    expect(entry.pdf.download).to eq("%PDF-1.4 signed bytes")
    expect(entry.pdf.content_type).to eq("application/pdf")
    expect(entry.pdf.filename.to_s).to eq("ata-assinada-#{entry.id}-ata-final.pdf")
  end

  it "does not call the provider again once the copy is stored" do
    stub_provider
    described_class.call(entry: entry)

    described_class.call(entry: entry)

    expect(a_request(:get, url)).to have_been_made.once
  end

  it "is a no-op for an entry that is not signed or has no address yet" do
    pending = create(:minutes_entry, :pending_signature, school: school, signed_document_url: url)
    without_url = create(:minutes_entry, :signed, school: school)

    expect(described_class.call(entry: pending)).to be_success
    expect(described_class.call(entry: without_url)).to be_success
    expect(a_request(:get, url)).not_to have_been_made
  end

  it "reports a provider failure" do
    stub_provider(status: 500)

    expect(described_class.call(entry: entry).error_code).to eq(:provider_error)
    expect(entry.reload.pdf).not_to be_attached
  end

  it "refuses a response that is not a PDF" do
    stub_provider(body: "<html>login</html>")

    expect(described_class.call(entry: entry).error_code).to eq(:provider_error)
    expect(entry.reload.pdf).not_to be_attached
  end
end
