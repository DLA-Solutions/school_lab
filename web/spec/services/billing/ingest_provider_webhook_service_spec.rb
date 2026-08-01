# frozen_string_literal: true

require "rails_helper"

RSpec.describe Billing::IngestProviderWebhookService do
  include ActiveJob::TestHelper

  let(:school) { create(:school) }
  let(:pair) { OpensslCertificateHelper.generate_certificate_pair }
  let(:config) do
    create(:school_payment_provider,
           school: school,
           provider: "cora",
           certificate_pem: pair[:certificate_pem],
           private_key_pem: pair[:private_key_pem])
  end
  let(:event) do
    Gateways::BankSlip::ValueObjects::Event.new(
      provider: "cora",
      provider_event_id: "evt-1",
      event_type: "invoice.paid",
      provider_resource_id: "inv-123",
      payload: nil
    )
  end

  it "creates a webhook event and enqueues reconciliation" do
    expect do
      described_class.call(config: config, event: event)
    end.to have_enqueued_job(Billing::ReconcileWebhookEventJob)

    record = WebhookEvent.last
    expect(record).to have_attributes(
      school_id: school.id,
      provider: "cora",
      provider_event_id: "evt-1",
      provider_resource_id: "inv-123"
    )
  end
end
