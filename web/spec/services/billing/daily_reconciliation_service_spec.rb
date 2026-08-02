# frozen_string_literal: true

require "rails_helper"

RSpec.describe Billing::DailyReconciliationService do
  let(:school) { create(:school) }
  let(:adapter) { Gateways::BankSlip::Fake.new(school: school) }
  let(:pair) { OpensslCertificateHelper.generate_certificate_pair }
  let!(:config) do
    create(:school_payment_provider,
           school: school,
           provider: "fake",
           certificate_pem: pair[:certificate_pem],
           private_key_pem: pair[:private_key_pem])
  end
  let(:charge) { create(:charge, :issued, school: school) }
  let(:issuance) { charge.current_issuance }

  before do
    adapter.seed_open_invoice!(issuance: issuance, charge: charge)
  end

  it "records a payment discovered through list_invoices" do
    adapter.settle_invoice!(provider_invoice_id: issuance.provider_invoice_id)

    result = described_class.call(config: config, adapter: adapter)

    expect(result).to be_success
    expect(charge.reload).to be_paid
    expect(result.data.fetch(:reconciled_count)).to eq(1)
  end

  it "is idempotent for already-reconciled charges" do
    adapter.settle_invoice!(provider_invoice_id: issuance.provider_invoice_id)
    described_class.call(config: config, adapter: adapter)

    expect do
      described_class.call(config: config, adapter: adapter)
    end.not_to change(Payment, :count)
  end

  it "reports unissued charges" do
    failed_charge = create(:charge, school: school, due_date: 3.days.from_now.to_date)
    create(:charge_issuance, :failed, charge: failed_charge, school: school)
    create(:charge, school: school, due_date: 2.days.from_now.to_date)

    result = described_class.call(config: config, adapter: adapter)

    expect(result.data.fetch(:unissued).fetch(:permanently_failed).map(&:id)).to include(failed_charge.id)
    expect(result.data.fetch(:unissued).fetch(:never_attempted).size).to eq(1)
  end
end

RSpec.describe Billing::DailyReconciliationJob do
  include ActiveJob::TestHelper

  it "continues when one school fails authentication" do
    school_one = create(:school)
    school_two = create(:school)
    pair = OpensslCertificateHelper.generate_certificate_pair
    create(:school_payment_provider, school: school_one, provider: "fake",
                                     certificate_pem: pair[:certificate_pem], private_key_pem: pair[:private_key_pem])
    create(:school_payment_provider, school: school_two, provider: "fake",
                                     certificate_pem: pair[:certificate_pem], private_key_pem: pair[:private_key_pem])

    allow(Billing::DailyReconciliationService).to receive(:call).and_wrap_original do |method, **args|
      raise Gateways::BankSlip::AuthenticationError, "revoked" if args.fetch(:config).school_id == school_two.id

      method.call(**args)
    end

    expect { described_class.perform_now }.not_to raise_error
    expect(Billing::DailyReconciliationService).to have_received(:call).twice
  end
end
