# frozen_string_literal: true

module Billing
  class CancelChargeService < ApplicationService
    def initialize(charge:)
      @charge = charge
    end

    def call
      return ResponseService.failure(code: :invalid_state_transition) unless charge.may_cancel?

      charge.cancel!
      ResponseService.success(data: charge)
    end

    private

    attr_reader :charge
  end
end
