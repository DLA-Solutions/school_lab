# frozen_string_literal: true

module Billing
  class ReconcileInvoicePaymentService < ApplicationService
    def initialize(webhook_event:)
      @webhook_event = webhook_event
    end

    def call
      return ResponseService.success(data: :already_processed) if webhook_event.processed_at?

      ResponseService.failure(code: :not_implemented)
    end

    private

    attr_reader :webhook_event
  end
end
