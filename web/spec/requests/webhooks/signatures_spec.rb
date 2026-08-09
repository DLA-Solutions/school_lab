# frozen_string_literal: true

require "rails_helper"

RSpec.describe "Autentique signature webhook", type: :request do
  let(:school) { create(:school) }
  let(:secret) { "webhook-secret" }
  let!(:config) do
    create(:school_signature_provider, school: school, webhook_secret: secret)
  end
  let(:school_class) { create(:school_class, school: school) }
  let(:student) { create(:student, school: school, school_class: school_class) }
  let(:contract) do
    create(:contract, school: school, student: student, signature_status: "pending_signature",
                      signature_provider: "fake", provider_document_id: "doc-abc-123")
  end

  let(:finished_event) do
    {
      id: "evt_1",
      object: "event",
      type: "document.finished",
      created_at: "2026-08-09T12:00:00Z",
      data: { object: { id: contract.provider_document_id } }
    }.to_json
  end

  def sign(payload, key = secret)
    OpenSSL::HMAC.hexdigest("SHA256", key, payload)
  end

  def deliver(payload, signature:, token: config.webhook_endpoint_token)
    post "/webhooks/signatures/#{token}",
         params: payload,
         headers: { "X-Autentique-Signature" => signature, "CONTENT_TYPE" => "application/json" }
  end

  it "marks the contract signed when every signer is done" do
    deliver(finished_event, signature: sign(finished_event))

    expect(response).to have_http_status(:ok)
    expect(contract.reload.signature_status).to eq("signed")
    expect(contract.signed_at).to be_present
  end

  it "accepts a signature prefixed with the algorithm" do
    deliver(finished_event, signature: "sha256=#{sign(finished_event)}")

    expect(response).to have_http_status(:ok)
    expect(contract.reload).to be_signed
  end

  describe "verification" do
    # Without this, anyone who learns the URL could mark contracts as signed.
    it "rejects a body whose signature does not match" do
      deliver(finished_event, signature: sign(finished_event, "wrong-secret"))

      expect(response).to have_http_status(:unauthorized)
      expect(contract.reload.signature_status).to eq("pending_signature")
    end

    it "rejects a request with no signature at all" do
      deliver(finished_event, signature: "")

      expect(response).to have_http_status(:unauthorized)
    end

    # A tampered body has to fail even when the original digest is replayed.
    it "rejects a body that was altered after signing" do
      signature = sign(finished_event)
      tampered = finished_event.sub("doc-abc-123", "doc-someone-else")

      deliver(tampered, signature: signature)

      expect(response).to have_http_status(:unauthorized)
    end

    it "404s an unknown token rather than revealing whether it exists" do
      deliver(finished_event, signature: sign(finished_event), token: "not-a-token")

      expect(response).to have_http_status(:not_found)
    end

    # A configuration with no secret cannot authenticate anything.
    it "rejects everything when the school has no webhook secret" do
      config.update!(webhook_secret: nil)

      deliver(finished_event, signature: sign(finished_event))

      expect(response).to have_http_status(:unauthorized)
    end
  end

  describe "events it does not act on" do
    # Acknowledged, not acted upon — the provider must not retry an event we simply ignore.
    it "acknowledges a partial signature without changing the contract" do
      payload = {
        id: "evt_2", type: "signature.accepted",
        data: { object: { id: contract.provider_document_id } }
      }.to_json

      deliver(payload, signature: sign(payload))

      expect(response).to have_http_status(:ok)
      expect(contract.reload.signature_status).to eq("pending_signature")
    end

    it "acknowledges a document this school does not know" do
      payload = {
        id: "evt_3", type: "document.finished", data: { object: { id: "doc-unknown" } }
      }.to_json

      deliver(payload, signature: sign(payload))

      expect(response).to have_http_status(:ok)
    end

    it "does not touch another school's contract" do
      other_school = create(:school)
      other_class = create(:school_class, school: other_school)
      other = create(:contract, school: other_school,
                                student: create(:student, school: other_school, school_class: other_class),
                                signature_status: "pending_signature",
                                provider_document_id: "doc-abc-123")

      deliver(finished_event, signature: sign(finished_event))

      expect(response).to have_http_status(:ok)
      expect(other.reload.signature_status).to eq("pending_signature")
    end
  end

  it "is idempotent when the provider retries" do
    2.times { deliver(finished_event, signature: sign(finished_event)) }
    first_signed_at = contract.reload.signed_at

    deliver(finished_event, signature: sign(finished_event))

    expect(response).to have_http_status(:ok)
    expect(contract.reload.signed_at).to eq(first_signed_at)
  end
end
