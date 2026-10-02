# frozen_string_literal: true

require "rails_helper"

RSpec.describe Gateways::Push::Fake do
  subject(:adapter) { described_class.new }

  after { described_class.reset! }

  describe "#deliver" do
    it "records the payload without calling FCM" do
      result = adapter.deliver(token: "device-token", title: "Boletim disponível", body: "Confira agora",
                                data: { kind: "report_card" })

      expect(result.message_id).to start_with("fake-")
      expect(described_class.deliveries).to eq(
        [ { token: "device-token", title: "Boletim disponível", body: "Confira agora", data: { kind: "report_card" } } ]
      )
    end
  end
end
