# frozen_string_literal: true

require "rails_helper"

RSpec.describe Backoffice::RegisterSpedyApiKeyService do
  subject(:result) { described_class.call(school: school, actor: actor, api_key: api_key, company_id: company_id) }

  let(:base_url) { "https://spedy.test/v1" }
  let(:school) { create(:school) }
  let(:actor) { create(:user) }
  let(:api_key) { "customer-company-key" }
  let(:company_id) { nil }
  let(:companies_body) { { items: [ { id: "company-1", name: "Escola" } ] }.to_json }

  before do
    allow(SchoolLab::Integrations::Spedy::Configuration).to receive(:current).and_return(api_base_url: base_url)
    stub_request(:get, "#{base_url}/companies")
      .with(headers: { "X-Api-Key" => api_key })
      .to_return(status: 200, body: companies_body)
  end

  context "with a per-school base_url" do
    subject(:result) do
      described_class.call(school: school, actor: actor, api_key: api_key, base_url: custom_base_url)
    end

    let(:custom_base_url) { "https://sandbox.spedy.test/v1/" }

    before do
      stub_request(:get, "https://sandbox.spedy.test/v1/companies")
        .with(headers: { "X-Api-Key" => api_key })
        .to_return(status: 200, body: companies_body)
    end

    it "validates the key against that URL and stores the normalized value in settings" do
      expect(result).to be_success
      expect(a_request(:get, "https://sandbox.spedy.test/v1/companies")).to have_been_made.once
      expect(a_request(:get, "#{base_url}/companies")).not_to have_been_made
      expect(result.data.reload.settings).to include("base_url" => "https://sandbox.spedy.test/v1",
                                                     "spedy_company_id" => "company-1")
    end

    it "does not put the key in the stored settings" do
      expect(result.data.settings.to_s).not_to include(api_key)
    end

    context "when the URL is not https" do
      let(:custom_base_url) { "http://sandbox.spedy.test/v1" }

      it "fails with validation_error on base_url and never calls Spedy" do
        expect(result.error_code).to eq(:validation_error)
        expect(result.details).to eq(base_url: [ "invalid" ])
        expect(a_request(:get, /spedy\.test/)).not_to have_been_made
        expect(SchoolPaymentProvider.where(school: school)).to be_empty
      end
    end

    context "when the URL is garbage" do
      let(:custom_base_url) { "not a url" }

      it "fails with validation_error on base_url" do
        expect(result.details).to eq(base_url: [ "invalid" ])
      end
    end

    context "when the URL is blank" do
      let(:custom_base_url) { "  " }

      it "falls back to the default URL and stores no base_url" do
        expect(result).to be_success
        expect(a_request(:get, "#{base_url}/companies")).to have_been_made.once
        expect(result.data.settings).not_to have_key("base_url")
      end
    end
  end

  context "when the list holds exactly one company" do
    it "stores the key and discovered company id on a new active row" do
      expect(result).to be_success

      record = result.data
      expect(record).to have_attributes(
        school_id: school.id, instrument: "service_invoice", provider: "spedy", active: true,
        api_key: api_key, spedy_company_id: "company-1", uploaded_by_id: actor.id
      )
      expect(record.uploaded_at).to be_present
    end

    it "does not persist the key in plain text" do
      result
      raw = SchoolPaymentProvider.connection.select_value("SELECT api_key FROM school_payment_providers ORDER BY id DESC LIMIT 1")
      expect(raw).not_to include(api_key)
    end
  end

  context "when the response is a bare array" do
    let(:companies_body) { [ { id: "company-9" } ].to_json }

    it "discovers the company id" do
      expect(result.data.spedy_company_id).to eq("company-9")
    end
  end

  context "when the list is empty" do
    let(:companies_body) { { items: [] }.to_json }

    it "fails with fiscal_configuration_incomplete and stores nothing" do
      expect(result.error_code).to eq(:fiscal_configuration_incomplete)
      expect(SchoolPaymentProvider.where(school: school)).to be_empty
    end
  end

  context "when the list is ambiguous" do
    let(:companies_body) { { items: [ { id: "a" }, { id: "b" } ] }.to_json }

    it "fails with fiscal_configuration_incomplete" do
      expect(result.error_code).to eq(:fiscal_configuration_incomplete)
    end

    context "with an explicit company_id" do
      let(:company_id) { "b" }

      before do
        stub_request(:get, "#{base_url}/companies/b").to_return(status: 200, body: { id: "b" }.to_json)
      end

      it "uses the supplied id after confirming it with Spedy" do
        expect(result).to be_success
        expect(result.data.spedy_company_id).to eq("b")
      end
    end
  end

  context "with a supplied company_id Spedy does not know" do
    let(:company_id) { "ghost" }

    before do
      stub_request(:get, "#{base_url}/companies/ghost").to_return(status: 400, body: { message: "x" }.to_json)
    end

    it "fails with validation_error on company_id" do
      expect(result.error_code).to eq(:validation_error)
      expect(result.details).to eq(company_id: [ "invalid" ])
    end
  end

  context "when the key is blank" do
    let(:api_key) { "   " }

    it "fails with validation_error and never calls Spedy" do
      expect(result.error_code).to eq(:validation_error)
      expect(result.details).to eq(api_key: [ "blank" ])
      expect(a_request(:get, /spedy\.test/)).not_to have_been_made
    end
  end

  context "when the key contains whitespace" do
    let(:api_key) { "two words" }

    it "fails with validation_error" do
      expect(result.details).to eq(api_key: [ "invalid" ])
    end
  end

  context "when Spedy rejects the key" do
    before { stub_request(:get, "#{base_url}/companies").to_return(status: 403, body: "") }

    it "fails with provider_error without echoing the key" do
      expect(result.error_code).to eq(:provider_error)
      expect(result.details[:message]).to match(/authentication failed/)
      expect(result.details.to_s).not_to include(api_key)
      expect(SchoolPaymentProvider.where(school: school)).to be_empty
    end
  end

  context "when Spedy is unreachable" do
    before { stub_request(:get, "#{base_url}/companies").to_timeout }

    it "fails with provider_error" do
      expect(result.error_code).to eq(:provider_error)
    end
  end

  context "when Spedy returns an unparseable body" do
    let(:companies_body) { "<html>" }

    it "fails with provider_error" do
      expect(result.error_code).to eq(:provider_error)
    end
  end

  context "when a previous Spedy row is active" do
    let!(:previous) { create(:school_payment_provider, :spedy, school: school) }
    let!(:bank_slip) { create(:school_payment_provider, school: school, instrument: "bank_slip") }

    it "supersedes it and leaves other instruments alone" do
      expect(result).to be_success

      expect(previous.reload.active).to be(false)
      expect(bank_slip.reload.active).to be(true)
      expect(school.school_payment_providers.active.where(instrument: "service_invoice")).to contain_exactly(result.data)
    end

    it "keeps the previous row active when the key is rejected" do
      stub_request(:get, "#{base_url}/companies").to_return(status: 401, body: "")

      expect(result.error_code).to eq(:provider_error)
      expect(previous.reload.active).to be(true)
    end
  end

  context "when another school already uses the company id" do
    before do
      create(:school_payment_provider, :spedy, settings: { spedy_company_id: "company-1" })
    end

    it "fails with validation_error so webhooks cannot cross schools" do
      expect(result.error_code).to eq(:validation_error)
      expect(result.details).to eq(company_id: [ "taken" ])
    end
  end

  it "produces a row the certificate upload and settings services accept" do
    result
    config = Gateways::ServiceInvoice::Registry.active_config(school: school)

    expect(config.api_key).to eq(api_key)
    expect(config.spedy_company_id).to eq("company-1")
  end
end
