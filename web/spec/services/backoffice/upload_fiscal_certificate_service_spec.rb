# frozen_string_literal: true

require "rails_helper"

RSpec.describe Backoffice::UploadFiscalCertificateService do
  subject(:result) do
    described_class.call(school: school, actor: create(:user), certificate_io: StringIO.new("pfx-bytes"), password: "secret")
  end

  let(:school) { create(:school) }
  let(:api_key) { "school-company-key" }

  context "when the school credential stores a base_url" do
    before do
      create(:school_payment_provider, :spedy, school: school, api_key: api_key,
                                                settings: { spedy_company_id: "c-1", base_url: "https://sandbox.spedy.test/v1" })
    end

    it "uploads the certificate at the school's base URL" do
      stub = stub_request(:post, "https://sandbox.spedy.test/v1/companies/c-1/certificates")
             .with(headers: { "X-Api-Key" => api_key })
             .to_return(status: 200, body: "{}")

      expect(result).to be_success
      expect(stub).to have_been_requested
    end
  end

  context "when the school credential has no base_url" do
    before { create(:school_payment_provider, :spedy, school: school, api_key: api_key) }

    it "uses the default URL" do
      stub = stub_request(:post, "https://api.spedy.com.br/v1/companies/company-123/certificates").to_return(status: 200, body: "{}")

      expect(result).to be_success
      expect(stub).to have_been_requested
    end
  end
end
