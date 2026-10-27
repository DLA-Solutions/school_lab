# frozen_string_literal: true

require "rails_helper"

RSpec.describe Billing::ConfigureSpedyCompanySettingsService do
  subject(:result) { described_class.call(school: school, settings_params: { "issuanceCity" => "Goiânia" }) }

  let(:school) { create(:school) }
  let(:api_key) { "school-company-key" }

  context "when the school credential stores a base_url" do
    before do
      create(:school_payment_provider, :spedy, school: school, api_key: api_key,
                                                settings: { spedy_company_id: "c-1", base_url: "https://sandbox.spedy.test/v1" })
    end

    it "updates the company settings at the school's base URL" do
      stub = stub_request(:put, "https://sandbox.spedy.test/v1/companies/c-1/settings")
             .with(headers: { "X-Api-Key" => api_key })
             .to_return(status: 200, body: "{}")

      expect(result).to be_success
      expect(stub).to have_been_requested
    end
  end

  context "when the school credential has no base_url" do
    before { create(:school_payment_provider, :spedy, school: school, api_key: api_key) }

    it "uses the default URL" do
      stub = stub_request(:put, "https://api.spedy.com.br/v1/companies/company-123/settings").to_return(status: 200, body: "{}")

      expect(result).to be_success
      expect(stub).to have_been_requested
    end
  end
end
