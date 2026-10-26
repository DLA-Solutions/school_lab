# frozen_string_literal: true

require "rails_helper"

RSpec.describe Backoffice::UploadBankCredentialsService do
  let(:school) { create(:school) }
  let(:actor) { create(:user) }
  let(:pair) { OpensslCertificateHelper.generate_certificate_pair }

  def upload(client_id: "client-001", provider: "cora", client_secret: nil)
    described_class.call(
      school: school,
      actor: actor,
      provider: provider,
      instrument: "bank_slip",
      client_id: client_id,
      client_secret: client_secret,
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

  it "refuses a provider the API does not accept, so no school is pointed at the fake adapter" do
    result = nil

    expect { result = upload(provider: "fake") }.not_to change(SchoolPaymentProvider, :count)

    expect(result).to be_failure
    expect(result.error_code).to eq(:validation_error)
    expect(result.details).to have_key(:provider)
  end

  it "supersedes the previous active configuration, whatever its provider" do
    create(:school_payment_provider, school: school, provider: "fake")

    result = upload

    configs = school.school_payment_providers.where(instrument: "bank_slip")
    expect(configs.count).to eq(2)
    expect(configs.active.pluck(:id)).to eq([ result.data.id ])
  end

  it "persists client_secret for inter, round-tripping through encryption" do
    result = upload(client_id: "inter-client-001", provider: "inter", client_secret: "inter-secret-001")

    expect(result).to be_success
    expect(result.data.provider).to eq("inter")
    expect(result.data.client_secret).to eq("inter-secret-001")
    expect(result.data.reload.client_secret).to eq("inter-secret-001")
  end

  it "requires client_secret for inter and stores nothing without it" do
    result = nil

    expect { result = upload(provider: "inter", client_secret: nil) }
      .not_to change(SchoolPaymentProvider, :count)

    expect(result).to be_failure
    expect(result.error_code).to eq(:validation_error)
    expect(result.details).to have_key(:client_secret)
  end

  it "does not require client_secret for cora" do
    expect(upload(provider: "cora", client_secret: nil)).to be_success
  end

  it "keeps the active cora configuration when an inter upload is invalid" do
    cora = create(:school_payment_provider, :cora, :active, school: school)

    upload(provider: "inter", client_secret: nil)

    expect(cora.reload).to be_active
  end

  it "replaces an active cora configuration with inter, leaving exactly one active" do
    cora = create(:school_payment_provider, :cora, :active, school: school)

    result = upload(client_id: "inter-client-001", provider: "inter", client_secret: "inter-secret-001")

    expect(result).to be_success
    expect(cora.reload).not_to be_active
    expect(school.school_payment_providers.active.where(instrument: "bank_slip").pluck(:id))
      .to eq([ result.data.id ])
    expect(Gateways::BankSlip::Registry.active_config(school: school).provider).to eq("inter")
  end

  # The bank issues a `.crt` and a `.key` pair; files saved on Windows carry CRLF line endings.
  it "accepts an inter certificate and key saved with CRLF line endings" do
    result = described_class.call(
      school: school, actor: actor, provider: "inter", instrument: "bank_slip",
      client_id: "inter-client-001", client_secret: "inter-secret-001",
      certificate_io: StringIO.new(pair[:certificate_pem].gsub("\n", "\r\n")),
      private_key_io: StringIO.new(pair[:private_key_pem].gsub("\n", "\r\n"))
    )

    expect(result).to be_success
  end
end
