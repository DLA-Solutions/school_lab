# frozen_string_literal: true

module Billing
  class DiscardChargeService < ApplicationService
    def initialize(charge:, actor:)
      @charge = charge
      @actor = actor
    end

    def call
      return ResponseService.failure(code: :invalid_state_transition) if charge.discarded?

      charge.update!(discarded_by: actor)
      charge.discard

      ResponseService.success
    end

    private

    attr_reader :charge, :actor
  end
end
