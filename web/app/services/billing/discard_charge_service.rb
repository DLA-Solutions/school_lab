# frozen_string_literal: true

module Billing
  class DiscardChargeService < ApplicationService
    def initialize(charge:, actor:, adapter: nil)
      @charge = charge
      @actor = actor
      @adapter = adapter
    end

    def call
      return ResponseService.failure(code: :invalid_state_transition) if charge.discarded?

      remote_result = RemoteInvoiceCancellation.new(charge: charge, adapter: adapter).call
      return remote_result if remote_result.failure?

      charge.update!(discarded_by: actor)
      charge.discard

      ResponseService.success
    end

    private

    attr_reader :charge, :actor, :adapter
  end
end
