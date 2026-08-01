# frozen_string_literal: true

module Billing
  class ReissueChargeService < ApplicationService
    def initialize(charge:, adapter: nil)
      @charge = charge
      @adapter = adapter || Gateways::BankSlip::Registry.resolve(school: charge.school)
    end

    def call
      return ResponseService.failure(code: :invalid_state_transition) unless charge.pending? || charge.overdue?

      request = Gateways::BankSlip::IssueRequestBuilder.from_charge(charge)
      result = adapter.issue(request)
      charge.update!(
        provider_invoice_id: result.provider_invoice_id,
        boleto_url: result.boleto_url,
        pix_copy_paste: result.pix_emv
      )

      ResponseService.success(data: charge)
    end

    private

    attr_reader :charge, :adapter
  end
end
