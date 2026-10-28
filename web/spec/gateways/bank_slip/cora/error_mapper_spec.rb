# frozen_string_literal: true

require "rails_helper"

RSpec.describe Gateways::BankSlip::Cora::ErrorMapper do
  it "maps Cora errors to port errors with no provider data to forward" do
    expect { described_class.map(SchoolLab::Integrations::Cora::AuthenticationError.new("denied")) }
      .to raise_error(Gateways::BankSlip::AuthenticationError) { |error|
        expect(error.message).to eq("denied")
        expect(error.http_status).to be_nil
        expect(error.provider_response).to be_nil
      }
  end
end
