# frozen_string_literal: true

require "rails_helper"

RSpec.describe Backoffice::UploadBankCredentialsService do
  let(:school) { create(:school) }
  let(:actor) { create(:user) }
  let(:pair) { OpensslCertificateHelper.generate_certificate_pair }

  def upload(client_id: "client-001", provider: "cora")
    described_class.call(
      school: school,
      actor: actor,
      provider: provider,
      instrument: "bank_slip",
      client_id: client_id,
      certificate_io: StringIO.new(pair[:certificate_pem]),
      private_key_io: StringIO.new(pair[:private_key_pem])
    )
  end

  it "activates the configuration when the credentials are complete" do
    result = upload

    expect(result).to be_success
    expect(result.data).to be_active
    expect(Gateways::BankSlip::Registry.active_config(school: school)).to eq(result.data)
  end

  it "rejects a cora upload without a client id, leaving the school unable to issue" do
    result = nil

    expect { result = upload(client_id: nil) }.not_to change(SchoolPaymentProvider, :count)

    expect(result).to be_failure
    expect(result.error_code).to eq(:validation_error)
    expect(result.details).to have_key(:client_id)
    expect { Gateways::BankSlip::Registry.active_config(school: school) }
      .to raise_error(Gateways::BankSlip::Registry::UnknownProviderError)
  end

  it "supersedes the previous active configuration, whatever its provider" do
    create(:school_payment_provider, school: school, provider: "fake")

    result = upload

    configs = school.school_payment_providers.where(instrument: "bank_slip")
    expect(configs.count).to eq(2)
    expect(configs.active.pluck(:id)).to eq([ result.data.id ])
  end
end
