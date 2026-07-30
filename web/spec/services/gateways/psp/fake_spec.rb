# frozen_string_literal: true

require "rails_helper"

RSpec.describe Gateways::Psp::Fake do
  subject(:gateway) { described_class.new }

  let(:school) { create(:school) }
  let(:charge) do
    Charge.new(school_id: school.id, id: 42, billing_period: "2026-08", total_amount: 850.00)
  end

  describe "#issue" do
    it "returns boleto and pix without external HTTP" do
      result = gateway.issue(charge: charge)

      expect(result.boleto_url).to include("fake-psp.example/boleto/")
      expect(result.pix_copy_paste).to start_with("00020126580014br.gov.bcb.pix")
      expect(result.psp_charge_id).to start_with("fake-#{school.id}-")
    end
  end

  describe "#verify_signature" do
    it "validates HMAC signatures" do
      payload = '{"event_id":"evt-1"}'
      signature = gateway.sign_payload(payload: payload)

      expect(gateway.verify_signature(payload: payload, signature: signature)).to be(true)
      expect(gateway.verify_signature(payload: payload, signature: "invalid")).to be(false)
    end
  end
end
