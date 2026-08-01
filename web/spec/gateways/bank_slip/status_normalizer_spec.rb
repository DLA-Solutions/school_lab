# frozen_string_literal: true

require "rails_helper"

RSpec.describe Gateways::BankSlip::StatusNormalizer do
  let(:mapping) { { "OPEN" => "open", "PAID" => "paid" } }

  it "normalizes known provider statuses" do
    expect(described_class.normalize("OPEN", mapping: mapping)).to eq("open")
  end

  it "raises ProviderError for unknown statuses" do
    expect do
      described_class.normalize("MYSTERY", mapping: mapping)
    end.to raise_error(Gateways::BankSlip::ProviderError, /Unmapped provider status/)
  end
end
