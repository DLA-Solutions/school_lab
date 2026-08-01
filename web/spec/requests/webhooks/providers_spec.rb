# frozen_string_literal: true

require "rails_helper"

RSpec.describe "POST /webhooks/:provider/:token", type: :request do
  include ActiveJob::TestHelper

  let(:school) { create(:school) }
  let(:pair) { OpensslCertificateHelper.generate_certificate_pair }
  let!(:config) do
    create(:school_payment_provider,
           school: school,
           provider: "cora",
           certificate_pem: pair[:certificate_pem],
           private_key_pem: pair[:private_key_pem])
  end
  let(:guardian) { create(:guardian, school: school) }
  let(:student) { create(:student, school: school) }
  let(:billing_plan) { create(:billing_plan, school: school) }
  let(:contract) { create(:contract, school: school, student: student, billing_plan: billing_plan) }
  let!(:charge) do
    create(:charge, :issued, school: school, contract: contract, guardian: guardian)
  end
  let(:issuance) { charge.current_issuance }

  def post_cora_webhook(token: config.webhook_endpoint_token, headers: {}, **overrides)
    default_headers = {
      "webhook-event-id" => "evt-cora-1",
      "webhook-event-type" => "invoice.paid",
      "webhook-resource-id" => issuance.provider_invoice_id
    }.merge(headers).merge(overrides)

    post "/webhooks/cora/#{token}", headers: default_headers
  end

  it "stores webhook event and enqueues reconciliation without calling the provider" do
    adapter = instance_double(Gateways::BankSlip::Cora::Adapter)
    allow(Gateways::BankSlip::Registry).to receive(:resolve).and_return(adapter)

    expect do
      post_cora_webhook
    end.to have_enqueued_job(Billing::ReconcileWebhookEventJob)

    expect(response).to have_http_status(:ok)
    event = WebhookEvent.find_by(provider: "cora", provider_event_id: "evt-cora-1")
    expect(event).to have_attributes(
      school_id: school.id,
      event_type: "invoice.paid",
      provider_resource_id: issuance.provider_invoice_id,
      processed_at: nil
    )
    expect(adapter).not_to have_received(:fetch_invoice) if adapter.respond_to?(:fetch_invoice)
  end

  it "returns 404 for an unknown token without revealing details" do
    post_cora_webhook(token: "unknown-token")

    expect(response).to have_http_status(:not_found)
    expect(response.body).to be_blank
    expect(WebhookEvent.count).to eq(0)
  end

  it "records a school mismatch instead of reconciling another school's invoice" do
    other_school = create(:school)
    other_charge = create(:charge, :issued, school: other_school)

    post_cora_webhook(headers: { "webhook-resource-id" => other_charge.provider_invoice_id })

    expect(response).to have_http_status(:ok)
    expect(Payment.count).to eq(0)
    event = WebhookEvent.find_by(provider_event_id: "evt-cora-1")
    expect(event.processing_error).to include("school_mismatch")
    expect(event.processed_at).to be_present
    expect(enqueued_jobs.none? { |job| job[:job] == Billing::ReconcileWebhookEventJob }).to be(true)
  end

  it "is idempotent for duplicate provider event ids" do
    post_cora_webhook
    expect(response).to have_http_status(:ok)

    expect do
      post_cora_webhook
    end.not_to have_enqueued_job(Billing::ReconcileWebhookEventJob)

    expect(response).to have_http_status(:ok)
    expect(WebhookEvent.where(provider: "cora", provider_event_id: "evt-cora-1").count).to eq(1)
  end

  it "returns 400 when required headers are missing" do
    post "/webhooks/cora/#{config.webhook_endpoint_token}",
         headers: { "webhook-event-type" => "invoice.paid" }

    expect(response).to have_http_status(:bad_request)
    expect(WebhookEvent.count).to eq(0)
  end

  context "with the fake provider JSON parser" do
    let(:fake_school) { create(:school) }
    let!(:fake_config) do
      create(:school_payment_provider,
             school: fake_school,
             provider: "fake",
             certificate_pem: pair[:certificate_pem],
             private_key_pem: pair[:private_key_pem])
    end
    let!(:fake_issuance) do
      charge = create(:charge, :issued, school: fake_school)
      charge.current_issuance
    end

    def post_fake_webhook(payload_hash)
      post "/webhooks/fake/#{fake_config.webhook_endpoint_token}",
           params: payload_hash.to_json,
           headers: { "CONTENT_TYPE" => "application/json" }
    end

    it "accepts JSON body notifications through the fake parser" do
      expect do
        post_fake_webhook(
          event_id: "evt-fake-1",
          event_type: "payment.confirmed",
          provider_invoice_id: fake_issuance.provider_invoice_id
        )
      end.to have_enqueued_job(Billing::ReconcileWebhookEventJob)

      expect(response).to have_http_status(:ok)
      expect(WebhookEvent.find_by(provider: "fake", provider_event_id: "evt-fake-1")).to be_present
    end
  end

  it "does not expose the legacy psp webhook route" do
    expect(Rails.application.routes.url_helpers).not_to respond_to(:webhooks_psp_path)
  end
end
