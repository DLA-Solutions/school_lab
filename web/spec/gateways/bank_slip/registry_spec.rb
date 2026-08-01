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
end
