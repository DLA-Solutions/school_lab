# frozen_string_literal: true

module Gateways
  module BankSlip
    Capabilities = Data.define(
      :inline_pix,
      :native_notifications,
      :cancellation,
      :fine_and_interest,
      :past_due_reissue,
      :boleto_pdf
    ) do
      # `boleto_pdf` — the adapter can hand back the boleto PDF bytes on demand (`#boleto_pdf`).
      # Providers that expose a hosted `boleto_url` instead (Cora) leave it false. Defaults to
      # false so adapters that predate the capability keep building unchanged.
      def initialize(inline_pix:, native_notifications:, cancellation:, fine_and_interest:, past_due_reissue:,
                     boleto_pdf: false)
        super
      end

      def self.full
        new(
          inline_pix: true,
          native_notifications: false,
          cancellation: true,
          fine_and_interest: true,
          past_due_reissue: true,
          boleto_pdf: true
        )
      end
    end
  end
end
