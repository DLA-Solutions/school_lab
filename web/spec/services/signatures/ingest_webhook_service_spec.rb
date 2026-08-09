# frozen_string_literal: true

require "rails_helper"

RSpec.describe Signatures::IngestWebhookService do
  let(:school) { create(:school) }
  let(:config) { create(:school_signature_provider, school: school) }

  # Rails rejects an unparseable body before the controller runs, but the service is also reachable
  # from reconciliation paths where the payload comes from elsewhere.
  it "refuses a payload that is not JSON" do
    expect(described_class.call(config: config, payload: "not json")).to be_failure
  end

  it "refuses an empty payload" do
    expect(described_class.call(config: config, payload: "")).to be_failure
  end

  # An event with no document id cannot be attributed, but it is not worth a retry either.
  it "acknowledges a finished event with no document id" do
    payload = { type: "document.finished", data: {} }.to_json

    expect(described_class.call(config: config, payload: payload)).to be_success
  end
end
