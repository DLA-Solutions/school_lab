# frozen_string_literal: true

require "rails_helper"

RSpec.describe Webhooks::Parsers::Inter do
  def build_request(body)
    instance_double(ActionDispatch::Request, body: StringIO.new(body))
  end

  describe ".parse" do
    it "returns one event per entry for a multi-entry array body" do
      body = [
        { codigoSolicitacao: "req-1", situacao: "RECEBIDO", dataHoraSituacao: "2026-12-05T10:00:00Z" },
        { codigoSolicitacao: "req-2", situacao: "A_RECEBER", dataHoraSituacao: "2026-12-05T10:01:00Z" }
      ].to_json

      result = described_class.parse(build_request(body))

      expect(result).to be_success
      expect(result.data).to be_an(Array)
      expect(result.data.size).to eq(2)
      expect(result.data.map(&:provider_resource_id)).to eq(%w[req-1 req-2])
      expect(result.data).to all(be_a(Gateways::BankSlip::ValueObjects::Event))
      expect(result.data.first.provider).to eq("inter")
    end

    it "returns a one-element array (not a bare Event) for a single-entry array body" do
      body = [ { codigoSolicitacao: "req-1", situacao: "RECEBIDO", dataHoraSituacao: "2026-12-05T10:00:00Z" } ].to_json

      result = described_class.parse(build_request(body))

      expect(result).to be_success
      expect(result.data).to be_an(Array)
      expect(result.data.size).to eq(1)
      # Even wrapped alone, Array(result.data) in the controller is harmless either way — but
      # the parser itself always returns an array, for consistency with the multi-entry case.
      expect(Array(result.data)).to eq(result.data)
    end

    it "combines resource id, status and timestamp into provider_event_id so retries dedupe" do
      body = [ { codigoSolicitacao: "req-1", situacao: "RECEBIDO", dataHoraSituacao: "2026-12-05T10:00:00Z" } ].to_json

      result = described_class.parse(build_request(body))

      expect(result.data.first.provider_event_id).to eq("req-1:RECEBIDO:2026-12-05T10:00:00Z")
    end

    it "filters out entries missing codigoSolicitacao without failing the whole batch" do
      body = [
        { situacao: "RECEBIDO" },
        { codigoSolicitacao: "req-2", situacao: "A_RECEBER", dataHoraSituacao: "2026-12-05T10:01:00Z" }
      ].to_json

      result = described_class.parse(build_request(body))

      expect(result).to be_success
      expect(result.data.size).to eq(1)
      expect(result.data.first.provider_resource_id).to eq("req-2")
    end

    it "fails validation when every entry is missing codigoSolicitacao" do
      body = [ { situacao: "RECEBIDO" } ].to_json

      result = described_class.parse(build_request(body))

      expect(result).to be_failure
      expect(result.error_code).to eq(:validation_error)
    end

    it "fails validation for an empty array body" do
      result = described_class.parse(build_request("[]"))

      expect(result).to be_failure
      expect(result.error_code).to eq(:validation_error)
    end

    it "fails validation for a blank body" do
      result = described_class.parse(build_request(""))

      expect(result).to be_failure
      expect(result.error_code).to eq(:validation_error)
    end

    it "fails validation for an unparseable body instead of raising" do
      result = described_class.parse(build_request("not json"))

      expect(result).to be_failure
      expect(result.error_code).to eq(:validation_error)
    end

    it "stores the raw entry as the payload" do
      entry = { codigoSolicitacao: "req-1", situacao: "RECEBIDO", dataHoraSituacao: "2026-12-05T10:00:00Z" }
      result = described_class.parse(build_request([ entry ].to_json))

      expect(result.data.first.payload).to eq(entry.deep_stringify_keys)
    end
  end
end
