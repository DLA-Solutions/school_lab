# frozen_string_literal: true

module Platform
  class PersistRemoteInvoiceService < ApplicationService
    def initialize(subscription:, invoice:)
      @subscription = subscription
      @invoice = invoice
    end

    def call
      return ResponseService.success(data: nil) if invoice.blank? || invoice.external_id.blank?

      record = PlatformInvoice.find_or_initialize_by(
        provider: subscription.provider,
        external_invoice_id: invoice.external_id
      )
      record.assign_attributes(
        school: subscription.school,
        platform_subscription: subscription,
        status: invoice.status,
        amount_cents: invoice.amount_cents.to_i,
        due_at: invoice.due_at,
        paid_at: invoice.paid_at,
        hosted_invoice_url: invoice.hosted_url,
        payment_method: invoice.payment_method
      )
      record.save!
      ResponseService.success(data: record)
    rescue ActiveRecord::RecordInvalid => e
      ResponseService.failure(code: :validation_error, details: e.record.errors.to_hash)
    end

    private

    attr_reader :subscription, :invoice
  end
end
