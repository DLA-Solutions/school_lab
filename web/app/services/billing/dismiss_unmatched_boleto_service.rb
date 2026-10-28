# frozen_string_literal: true

module Billing
  # Staff decides a queued bank-created boleto (Billing::ImportExternalBoletosService) is not
  # worth linking to a guardian — closes it out with no charge created.
  class DismissUnmatchedBoletoService < ApplicationService
    def initialize(unmatched_boleto:, actor:)
      @unmatched_boleto = unmatched_boleto
      @actor = actor
    end

    def call
      return ResponseService.failure(code: :invalid_state_transition) unless unmatched_boleto.pending?

      unmatched_boleto.update!(status: "dismissed", resolved_at: Time.current, resolved_by: actor)
      ResponseService.success(data: unmatched_boleto)
    end

    private

    attr_reader :unmatched_boleto, :actor
  end
end
