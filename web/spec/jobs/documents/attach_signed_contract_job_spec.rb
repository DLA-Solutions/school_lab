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

  # The provider builds the signed PDF asynchronously, and the webhook's `document.finished`
  # fallback marks a contract signed without ever having read an address. The job must find the
  # file itself instead of waiting for tomorrow's sweep.
  describe "a signed contract whose file address is not on record yet" do
    let(:graphql_url) { "https://api.autentique.com.br/v2/graphql" }
    let(:contract) do
      create(:contract, school: school, student: student, signature_status: "signed",
                        signed_at: 1.hour.ago, provider_document_id: "doc-abc-123", signed_document_url: nil)
    end

    def stub_graphql(signed_url:)
      body = { data: { document: { id: "doc-abc-123", files: { signed: signed_url },
                                   signatures: [ { action: { name: "SIGN" }, signed: { created_at: "2026-01-01" },
                                                   email: "g@example.com" } ] } } }
      stub_request(:post, graphql_url)
        .to_return(status: 200, body: body.to_json, headers: { "Content-Type" => "application/json" })
    end

    it "asks the provider, records the address and files the document" do
      stub_graphql(signed_url: document_url)
      stub_provider

      expect { described_class.perform_now(contract.id, school.id) }.to change(Document, :count).by(1)

      expect(contract.reload.signed_document_url).to eq(document_url)
      expect(contract.signed_document).to be_approved
    end

    it "retries later while the provider has not published the signed file, filing nothing meanwhile" do
      stub_graphql(signed_url: nil)

      expect do
        described_class.perform_now(contract.id, school.id)
      end.to have_enqueued_job(described_class).with(contract.id, school.id)

      expect(Document.where(contract_id: contract.id)).to be_empty
      expect(contract.reload.signed_document_url).to be_blank
    end

    it "retries when the provider cannot be reached" do
      stub_request(:post, graphql_url).to_return(status: 502, body: "bad gateway")

      expect do
        described_class.perform_now(contract.id, school.id)
      end.to have_enqueued_job(described_class).with(contract.id, school.id)

      expect(Document.where(contract_id: contract.id)).to be_empty
    end

    it "gives up quietly after a bounded number of attempts, leaving the rest to the nightly sweep" do
      stub_graphql(signed_url: nil)

      perform_enqueued_jobs { described_class.perform_later(contract.id, school.id) }

      expect(a_request(:post, graphql_url)).to have_been_made.times(described_class::SIGNED_FILE_MAX_ATTEMPTS)
      expect(Document.where(contract_id: contract.id)).to be_empty
    end

    it "does not ask the provider about a contract that was never sent to it" do
      contract.update!(provider_document_id: nil)

      expect do
        described_class.perform_now(contract.id, school.id)
      end.not_to have_enqueued_job(described_class)

      expect(a_request(:post, graphql_url)).not_to have_been_made
    end

    it "does not touch a contract that is not signed" do
      contract.update!(signature_status: "pending_signature", signed_at: nil)

      described_class.perform_now(contract.id, school.id)

      expect(a_request(:post, graphql_url)).not_to have_been_made
      expect(Document.where(contract_id: contract.id)).to be_empty
    end

    it "does not file a second document when it runs again" do
      stub_graphql(signed_url: document_url)
      stub_provider

      described_class.perform_now(contract.id, school.id)

      expect { described_class.perform_now(contract.id, school.id) }.not_to change(Document, :count)
    end
  end
end
