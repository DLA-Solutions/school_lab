# frozen_string_literal: true

module Billing
  class CancelChargeService < ApplicationService
    def initialize(charge:, adapter: nil)
      @charge = charge
      @adapter = adapter
    end

    def call
      return ResponseService.failure(code: :invalid_state_transition) unless charge.may_cancel?

      remote_result = RemoteInvoiceCancellation.new(charge: charge, adapter: adapter).call
      return remote_result if remote_result.failure?

      charge.cancel!
      ResponseService.success(data: charge)
    end

    private

    attr_reader :charge, :adapter
  end
end
