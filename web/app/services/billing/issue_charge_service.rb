# frozen_string_literal: true

module Billing
  class IssueChargeService < ApplicationService
    def initialize(charge:, gateway: Gateways::Psp::Fake.new)
      @charge = charge
      @gateway = gateway
    end

    def call
      result = gateway.issue(charge: charge)

      charge.update!(
        psp_charge_id: result.psp_charge_id,
        boleto_url: result.boleto_url,
        pix_copy_paste: result.pix_copy_paste
      )

      ResponseService.success(data: result)
    end

    private

    attr_reader :charge, :gateway
  end
end
