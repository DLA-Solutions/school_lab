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
    it "returns the single active configuration for the school" do
      config = create(:school_payment_provider, :cora, school: school)

      expect(described_class.active_config(school: school)).to eq(config)
    end

    it "does not return another school's configuration" do
      create(:school_payment_provider, :cora, school: create(:school))

      expect do
        described_class.active_config(school: school)
      end.to raise_error(Gateways::BankSlip::Registry::UnknownProviderError)
    end

    it "fails explicitly and logs when the school has no active configuration" do
      expect(Rails.logger).to receive(:error).with(include("bank_slip.configuration_missing"))

      expect do
        described_class.active_config(school: school)
      end.to raise_error(
        Gateways::BankSlip::Registry::UnknownProviderError,
        /school #{school.id} \(no credentials were ever uploaded\) — upload current bank credentials/
      )
    end

    it "tells the operator that superseded credentials exist" do
      create(:school_payment_provider, :inactive, school: school)

      expect do
        described_class.active_config(school: school)
      end.to raise_error(
        Gateways::BankSlip::Registry::UnknownProviderError,
        /1 inactive one\(s\) exist/
      )
    end
  end

  it "requires an explicit provider — there is no default adapter" do
    expect { described_class.resolve(school: school) }.to raise_error(ArgumentError, /provider/)
  end
end
