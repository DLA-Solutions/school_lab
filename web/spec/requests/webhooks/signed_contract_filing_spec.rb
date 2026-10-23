# frozen_string_literal: true

require "rails_helper"

# The signed contract has to reach the guardian's "Meus documentos" from the provider's callback
# alone — including when the provider has not finished building the signed PDF yet.
RSpec.describe "Signed contract filing from the signature webhook", type: :request do
  include ActiveJob::TestHelper

  let(:school) { create(:school) }
  let(:secret) { "webhook-secret" }
  let!(:config) { create(:school_signature_provider, :autentique, school: school, webhook_secret: secret) }
  let(:guardian_user) { create(:user) }
  let!(:membership) { create(:membership, user: guardian_user, school: school, role: "guardian") }
  let!(:guardian) { create(:guardian, school: school, user: guardian_user, email: "g@example.com") }
  let(:student) { create(:student, school: school) }
  let!(:link) { create(:student_guardian, school: school, student: student, guardian: guardian) }
  let(:contract) do
    create(:contract, school: school, student: student, payer_guardian: guardian,
                      signature_status: "pending_signature", signature_provider: "autentique",
                      provider_document_id: "doc-abc-123", sent_at: 1.day.ago)
  end
  let(:graphql_url) { "https://api.autentique.com.br/v2/graphql" }
  let(:signed_url) { "https://api.autentique.com.br/documentos/doc-abc-123/assinado.pdf" }

  def graphql_response(signed_url:, signed: true)
    signature = { action: { name: "SIGN" }, email: "g@example.com",
                  signed: signed ? { created_at: "2026-01-01" } : nil }
    body = { data: { document: { id: "doc-abc-123", files: { signed: signed_url }, signatures: [ signature ] } } }
    { status: 200, body: body.to_json, headers: { "Content-Type" => "application/json" } }
  end

  def deliver_finished_event
    payload = {
      object: "webhook",
      event: { type: "document.finished", data: { object: { id: contract.provider_document_id } } }
    }.to_json

    perform_enqueued_jobs do
      post "/webhooks/signatures/#{config.webhook_endpoint_token}", params: payload,
           headers: { "X-Autentique-Signature" => OpenSSL::HMAC.hexdigest("SHA256", secret, payload),
                      "CONTENT_TYPE" => "application/json" }
    end
  end

  def listed_signed_contracts
    get "/api/v1/schools/#{school.id}/me/documents?document_type=signed_contract",
        headers: auth_headers_for(guardian_user)
    JSON.parse(response.body).fetch("data")
  end

  before { stub_request(:get, signed_url).to_return(status: 200, body: "%PDF-1.4 signed bytes") }

  it "lists the signed contract for the guardian once the provider reports it finished" do
    stub_request(:post, graphql_url).to_return(graphql_response(signed_url: signed_url))

    deliver_finished_event

    expect(response).to have_http_status(:ok)
    expect(contract.reload).to be_signed
    rows = listed_signed_contracts
    expect(rows.size).to eq(1)
    expect(rows.first).to include("document_type" => "signed_contract", "status" => "approved",
                                  "student_id" => student.id)
  end

  it "still files it when the first provider reads say pending or have no signed file yet" do
    stub_request(:post, graphql_url).to_return(
      graphql_response(signed_url: nil, signed: false),
      graphql_response(signed_url: nil),
      graphql_response(signed_url: signed_url)
    )

    deliver_finished_event

    expect(contract.reload).to be_signed
    expect(contract.signed_document_url).to eq(signed_url)
    expect(listed_signed_contracts.size).to eq(1)
  end

  it "files exactly one document when the provider replays the event" do
    stub_request(:post, graphql_url).to_return(graphql_response(signed_url: signed_url))

    2.times { deliver_finished_event }

    expect(Document.where(contract_id: contract.id).count).to eq(1)
    expect(listed_signed_contracts.size).to eq(1)
  end

  it "does not show another family's signed contract" do
    stranger_student = create(:student, school: school)
    other = create(:contract, school: school, student: stranger_student, signature_status: "signed",
                              signed_at: 1.hour.ago, signed_document_url: signed_url)
    stub_request(:post, graphql_url).to_return(graphql_response(signed_url: signed_url))
    Documents::AttachSignedContractService.call(contract: other)

    deliver_finished_event

    expect(listed_signed_contracts.map { |row| row["student_id"] }).to contain_exactly(student.id)
  end
end
