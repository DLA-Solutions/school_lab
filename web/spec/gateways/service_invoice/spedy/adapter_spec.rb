# frozen_string_literal: true

require "rails_helper"

RSpec.describe Gateways::ServiceInvoice::Spedy::Adapter do
  let(:school) { create(:school) }
  let(:api_key) { "school-company-key" }
  let(:document_body) { { id: "doc-1", status: "enqueued" }.to_json }

  def stub_fetch(base:)
    stub_request(:get, "#{base}/service-invoices/doc-1")
      .with(headers: { "X-Api-Key" => api_key })
      .to_return(status: 200, body: document_body)
  end

  context "when the school credential stores a base_url" do
    before do
      create(:school_payment_provider, :spedy, school: school, api_key: api_key,
                                                settings: { spedy_company_id: "c-1", base_url: "https://sandbox.spedy.test/v1" })
    end

    it "calls Spedy at the school's base URL" do
      stub = stub_fetch(base: "https://sandbox.spedy.test/v1")

      described_class.new(school: school).fetch(provider_document_id: "doc-1")

      expect(stub).to have_been_requested
    end
  end

  context "when the school credential has no base_url" do
    before do
      create(:school_payment_provider, :spedy, school: school, api_key: api_key)
    end

    it "calls Spedy at the default https://api.spedy.com.br/v1" do
      stub = stub_fetch(base: "https://api.spedy.com.br/v1")

      described_class.new(school: school).fetch(provider_document_id: "doc-1")

      expect(stub).to have_been_requested
    end
  end
end
