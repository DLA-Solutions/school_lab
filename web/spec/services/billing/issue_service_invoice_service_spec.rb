# frozen_string_literal: true

require "rails_helper"

RSpec.describe Billing::IssueServiceInvoiceService do
  subject(:result) { described_class.new(payment: payment, adapter: adapter).call }

  let(:school) { create(:school) }
  let(:guardian) { create(:guardian, school: school) }
  let(:charge) { create(:charge, :paid, school: school, guardian: guardian) }
  let(:payment) { create(:payment, charge: charge, school: school) }
  let(:adapter) { Gateways::ServiceInvoice::Fake.new(school: school) }

  before do
    create(:school_fiscal_setting, :enabled, school: school)
    create(:school_payment_provider, :spedy, school: school)
  end

  it "creates a service invoice and enqueues at provider" do
    expect { result }.to change(ServiceInvoice, :count).by(1)
    expect(result).to be_success
    expect(result.data.status).to eq("enqueued")
    expect(result.data.provider_document_id).to be_present
  end

  context "when invoice already exists for payment" do
    before { create(:service_invoice, payment: payment, charge: charge, school: school) }

    it "returns existing invoice without duplicating" do
      expect { result }.not_to change(ServiceInvoice, :count)
      expect(result).to be_success
    end
  end

  context "when fiscal settings are disabled" do
    before { school.school_fiscal_setting.update!(enabled: false) }

    it "returns fiscal_configuration_incomplete" do
      expect(result).to be_failure
      expect(result.error_code).to eq(:fiscal_configuration_incomplete)
    end
  end

  context "when guardian address is incomplete" do
    before { guardian.update_column(:street, nil) }

    it "marks invoice failed without raising" do
      expect(result).to be_failure
      expect(result.error_code).to eq(:validation_error)
    end
  end
end
