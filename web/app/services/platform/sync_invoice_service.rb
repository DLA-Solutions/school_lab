# frozen_string_literal: true

module Platform
  class SyncInvoiceService < ApplicationService
    def initialize(subscription:, remote_invoice:)
      @subscription = subscription
      @remote_invoice = remote_invoice
    end

    def call
      return ResponseService.success(data: nil) if remote_invoice.blank? || remote_invoice.external_invoice_id.blank?

      invoice = PlatformInvoice.find_or_initialize_by(
        provider: subscription.provider,
        external_invoice_id: remote_invoice.external_invoice_id
      )
      invoice.assign_attributes(
        school: subscription.school,
        platform_subscription: subscription,
        status: remote_invoice.status,
        amount_cents: remote_invoice.amount_cents,
        due_at: remote_invoice.due_at,
        paid_at: remote_invoice.paid_at,
        hosted_invoice_url: remote_invoice.hosted_invoice_url,
        payment_method: remote_invoice.payment_method
      )
      invoice.save!
      ResponseService.success(data: invoice)
    rescue ActiveRecord::RecordInvalid => e
      ResponseService.failure(code: :validation_error, details: e.record.errors.to_hash)
    end

    private

    attr_reader :subscription, :remote_invoice
  end
end
