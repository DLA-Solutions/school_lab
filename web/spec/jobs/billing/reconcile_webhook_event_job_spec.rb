# frozen_string_literal: true

require "rails_helper"

# Bug fix coverage: the job used to discard Billing::ReconcileInvoicePaymentService's result
# entirely, so a ResponseService.failure looked like a successful job to Solid Queue — no
# retry, no failed-job record, zero visibility. These specs drive the real service (and real
# AASM/ActiveRecord state) through a stubbed Gateways::BankSlip::Registry.resolve, following
# the same adapter test-double convention as spec/jobs/billing/sync_issuance_presentation_job_spec.rb,
# and assert what the job now does with each outcome.
RSpec.describe Billing::ReconcileWebhookEventJob, type: :job do
  let(:school) { create(:school) }
  let(:adapter) { instance_double(Gateways::BankSlip::Inter::Adapter) }

  before do
    allow(Gateways::BankSlip::Registry).to receive(:resolve).and_return(adapter)
  end

  def remote_invoice(provider_invoice_id:, status:, payments: [])
    Gateways::BankSlip::ValueObjects::RemoteInvoice.new(
      provider_invoice_id: provider_invoice_id,
      status: status,
      total_amount_cents: 85_000,
      due_date: Date.current,
      payments: payments
    )
  end

  context "when reconciliation succeeds" do
    it "completes without raising and marks the webhook_event processed" do
      charge = create(:charge, :issued, school: school)
      issuance = charge.current_issuance
      webhook_event = create(:webhook_event, school: school,
                                              provider_resource_id: issuance.provider_invoice_id)
      allow(adapter).to receive(:fetch_invoice)
        .and_return(remote_invoice(provider_invoice_id: issuance.provider_invoice_id, status: "open"))

      expect { described_class.perform_now(webhook_event.id) }.not_to raise_error

      expect(webhook_event.reload.processed_at).to be_present
    end
  end

  context "when the issuance cannot be resolved (:not_found)" do
    it "does not raise and logs a non-retryable warning, matching the service's own trace" do
      webhook_event = create(:webhook_event, school: school, provider_resource_id: "unknown-invoice")

      expect(Rails.logger).to receive(:warn).with(
        a_string_including("billing.reconcile_webhook_event.non_retryable_failure", "not_found")
      )

      expect { described_class.perform_now(webhook_event.id) }.not_to raise_error

      expect(webhook_event.reload).to have_attributes(processed_at: be_present, observed_status: "not_found")
    end
  end

  context "when the charge cannot transition to paid (:invalid_state_transition)" do
    it "does not raise and logs a non-retryable warning" do
      charge = create(:charge, :issued, :cancelled, school: school)
      issuance = charge.current_issuance
      webhook_event = create(:webhook_event, school: school,
                                              provider_resource_id: issuance.provider_invoice_id)
      payment = Gateways::BankSlip::ValueObjects::RemotePayment.new(
        provider_payment_id: "pay-1", paid_amount_cents: 85_000, paid_at: Time.current, payment_method: "pix"
      )
      allow(adapter).to receive(:fetch_invoice).and_return(
        remote_invoice(provider_invoice_id: issuance.provider_invoice_id, status: "paid", payments: [ payment ])
      )

      expect(Rails.logger).to receive(:warn).with(
        a_string_including("billing.reconcile_webhook_event.non_retryable_failure", "invalid_state_transition")
      )

      expect { described_class.perform_now(webhook_event.id) }.not_to raise_error

      expect(webhook_event.reload).to have_attributes(
        processed_at: be_present,
        processing_error: "invalid_state_transition"
      )
      expect(charge.reload).to be_cancelled
    end
  end

  context "when the provider returns a permanent error (:provider_error)" do
    it "raises ReconciliationFailedError so Solid Queue records a visible failed job" do
      charge = create(:charge, :issued, school: school)
      issuance = charge.current_issuance
      webhook_event = create(:webhook_event, school: school,
                                              provider_resource_id: issuance.provider_invoice_id)
      allow(adapter).to receive(:fetch_invoice).and_raise(Gateways::BankSlip::ProviderError, "invoice not found")

      expect { described_class.perform_now(webhook_event.id) }
        .to raise_error(described_class::ReconciliationFailedError, /provider_error/)

      expect(webhook_event.reload).to have_attributes(processed_at: be_present, processing_error: "invoice not found")
    end
  end

  context "when the provider rejects our credentials (:authentication_error)" do
    it "does not raise — AuthenticationFailedError is caught by the job's own retry_on, which " \
       "re-enqueues a bounded retry instead of propagating (often a transient token-cache expiry)" do
      charge = create(:charge, :issued, school: school)
      issuance = charge.current_issuance
      webhook_event = create(:webhook_event, school: school,
                                              provider_resource_id: issuance.provider_invoice_id)
      allow(adapter).to receive(:fetch_invoice).and_raise(Gateways::BankSlip::AuthenticationError, "token expired")

      expect { described_class.perform_now(webhook_event.id) }
        .to change { SolidQueue::Job.where(class_name: described_class.name).count }.by(1)

      expect(webhook_event.reload).to have_attributes(processed_at: be_present, processing_error: "token expired")
    end

    it "is registered for a bounded retry, unlike the generic ReconciliationFailedError" do
      expect(described_class.rescue_handlers.map(&:first)).to include(
        described_class::AuthenticationFailedError.name
      )
      expect(described_class.rescue_handlers.map(&:first)).not_to include(
        described_class::ReconciliationFailedError.name
      )
    end
  end

  context "when the provider is transiently unavailable" do
    it "does not raise — Gateways::BankSlip::TransientError is caught by the pre-existing " \
       "retry_on and re-enqueued, leaving the webhook_event unprocessed for the retry" do
      charge = create(:charge, :issued, school: school)
      issuance = charge.current_issuance
      webhook_event = create(:webhook_event, school: school,
                                              provider_resource_id: issuance.provider_invoice_id)
      allow(adapter).to receive(:fetch_invoice).and_raise(Gateways::BankSlip::TransientError, "timeout")

      expect { described_class.perform_now(webhook_event.id) }
        .to change { SolidQueue::Job.where(class_name: described_class.name).count }.by(1)

      expect(webhook_event.reload.processed_at).to be_nil
    end
  end
end
