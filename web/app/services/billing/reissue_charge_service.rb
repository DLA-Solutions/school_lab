# frozen_string_literal: true

module Billing
  class ReissueChargeService < ApplicationService
    def initialize(charge:, gateway: Gateways::Psp::Fake.new)
      @charge = charge
      @gateway = gateway
    end

    def call
      return ResponseService.failure(code: :invalid_state_transition) unless charge.pending? || charge.overdue?

      result = gateway.issue(charge: charge)
      charge.update!(
        provider_invoice_id: result.provider_invoice_id,
        boleto_url: result.boleto_url,
        pix_copy_paste: result.pix_copy_paste
      )

      ResponseService.success(data: charge)
    end

    private

    attr_reader :charge, :gateway
  end
end
