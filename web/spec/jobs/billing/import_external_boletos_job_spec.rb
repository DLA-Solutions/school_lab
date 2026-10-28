# frozen_string_literal: true

require "rails_helper"

RSpec.describe Billing::ImportExternalBoletosJob do
  def inter_config_for(school)
    pair = OpensslCertificateHelper.generate_certificate_pair
    create(:school_payment_provider, :inter, school: school,
                                              certificate_pem: pair[:certificate_pem],
                                              private_key_pem: pair[:private_key_pem])
  end

  it "calls the service once for each active inter/bank_slip config" do
    school_one = create(:school)
    school_two = create(:school)
    inter_config_for(school_one)
    inter_config_for(school_two)

    allow(Billing::ImportExternalBoletosService).to receive(:call).and_return(ResponseService.success(data: {}))

    described_class.perform_now

    expect(Billing::ImportExternalBoletosService).to have_received(:call).twice
  end

  it "ignores configs for other providers or instruments" do
    school = create(:school)
    create(:school_payment_provider, school: school, provider: "fake")
    create(:school_payment_provider, :spedy, school: school)

    allow(Billing::ImportExternalBoletosService).to receive(:call)

    described_class.perform_now

    expect(Billing::ImportExternalBoletosService).not_to have_received(:call)
  end

  it "continues when one school fails authentication, without raising" do
    school_one = create(:school)
    school_two = create(:school)
    inter_config_for(school_one)
    inter_config_for(school_two)

    allow(Billing::ImportExternalBoletosService).to receive(:call) do |config:|
      raise Gateways::BankSlip::AuthenticationError, "revoked" if config.school_id == school_two.id

      ResponseService.success(data: {})
    end

    expect { described_class.perform_now }.not_to raise_error
    expect(Billing::ImportExternalBoletosService).to have_received(:call).twice
  end
end
