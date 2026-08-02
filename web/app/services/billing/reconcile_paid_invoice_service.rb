# frozen_string_literal: true

module Billing
  class ReconcilePaidInvoiceService < ApplicationService
    def initialize(charge:, invoice:)
      @charge = charge
      @invoice = invoice
    end

    def call
      return ResponseService.success(data: :not_paid) unless invoice.status == "paid"
      return ResponseService.failure(code: :provider_error, details: { message: "paid invoice missing payments" }) if invoice.payments.empty?

      payments = invoice.payments.map do |remote_payment|
        result = RecordPaymentService.call(charge: charge, remote_payment: remote_payment)
        return result if result.failure?

        result.data
      end

      ResponseService.success(data: { charge: charge.reload, payments: payments })
    end

    private

    attr_reader :charge, :invoice
  end
end
