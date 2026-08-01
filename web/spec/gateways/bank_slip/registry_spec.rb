# frozen_string_literal: true

require "rails_helper"

RSpec.describe Gateways::BankSlip::Registry do
  let(:school) { create(:school) }

  it "resolves the fake adapter" do
    adapter = described_class.resolve(school: school, provider: "fake")

    expect(adapter).to be_a(Gateways::BankSlip::Fake)
  end

  it "raises for unknown providers without constantize" do
    expect do
      described_class.resolve(school: school, provider: "unknown_bank")
    end.to raise_error(Gateways::BankSlip::Registry::UnknownProviderError, /unknown_bank/)
  end

  describe ".active_config" do
    let(:pair) { OpensslCertificateHelper.generate_certificate_pair }

    it "returns the active configuration for the school" do
      config = create(:school_payment_provider, school: school, environment: "stage",
                                                  certificate_pem: pair[:certificate_pem],
                                                  private_key_pem: pair[:private_key_pem])

      expect(described_class.active_config(school: school, environment: "stage")).to eq(config)
    end

    it "does not return another school's configuration" do
      other_school = create(:school)
      create(:school_payment_provider, school: other_school, environment: "stage",
                                       certificate_pem: pair[:certificate_pem],
                                       private_key_pem: pair[:private_key_pem])

      expect do
        described_class.active_config(school: school, environment: "stage")
      end.to raise_error(Gateways::BankSlip::Registry::UnknownProviderError)
    end
  end
end
