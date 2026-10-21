# frozen_string_literal: true

require "rails_helper"

RSpec.describe Minutes::AttachSignedPdfJob do
  let(:school) { create(:school) }
  let!(:config) { create(:school_signature_provider, :autentique, school: school) }
  let(:url) { "https://api.autentique.com.br/documentos/abc123/assinado.pdf" }
  let(:entry) { create(:minutes_entry, :signed, school: school, signed_document_url: url) }

  it "stores the signed copy" do
    stub_request(:get, url).to_return(status: 200, body: "%PDF-1.4 ok")

    described_class.perform_now(entry.id, school.id)

    expect(entry.reload.pdf).to be_attached
  end

  it "raises on a provider failure so the job retries" do
    stub_request(:get, url).to_return(status: 503)

    expect { described_class.new.perform(entry.id, school.id) }
      .to raise_error(described_class::ProviderUnavailable)
  end

  it "ignores an entry of another school" do
    other = create(:school)

    expect { described_class.perform_now(entry.id, other.id) }.not_to raise_error
    expect(entry.reload.pdf).not_to be_attached
  end
end
