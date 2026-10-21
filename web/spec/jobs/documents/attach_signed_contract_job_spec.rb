# frozen_string_literal: true

require "rails_helper"

RSpec.describe Documents::AttachSignedContractJob, type: :job do
  include ActiveJob::TestHelper

  let(:school) { create(:school) }
  let!(:config) { create(:school_signature_provider, :autentique, school: school) }
  let(:student) { create(:student, school: school) }
  let(:document_url) { "https://api.autentique.com.br/documentos/abc123/assinado.pdf" }
  let(:contract) do
    create(:contract, school: school, student: student, signature_status: "signed",
                      signed_at: 1.hour.ago, signed_document_url: document_url)
  end

  def stub_provider(status: 200, body: "%PDF-1.4 signed bytes")
    stub_request(:get, document_url).to_return(status: status, body: body)
  end

  it "is enqueued on the default queue" do
    expect { described_class.perform_later(contract.id, school.id) }
      .to have_enqueued_job(described_class).on_queue("default").with(contract.id, school.id)
  end

  it "files the signed contract through the service" do
    stub_provider

    expect { described_class.perform_now(contract.id, school.id) }.to change(Document, :count).by(1)

    expect(contract.reload.signed_document).to be_approved
  end

  it "is idempotent across retries" do
    stub_provider

    described_class.perform_now(contract.id, school.id)

    expect { described_class.perform_now(contract.id, school.id) }.not_to change(Document, :count)
  end

  it "is retried later when the provider does not serve the file, and files nothing meanwhile" do
    stub_provider(status: 502, body: "bad gateway")

    expect do
      described_class.perform_now(contract.id, school.id)
    end.to have_enqueued_job(described_class).with(contract.id, school.id)

    expect(Document.where(contract_id: contract.id)).to be_empty
  end

  it "discards when the contract belongs to another school" do
    other_school = create(:school)

    expect(Documents::AttachSignedContractService).not_to receive(:call)

    described_class.perform_now(contract.id, other_school.id)
  end

  it "discards when the contract no longer exists" do
    expect { described_class.perform_now(0, school.id) }.not_to raise_error
  end
end
