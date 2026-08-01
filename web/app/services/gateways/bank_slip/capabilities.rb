# frozen_string_literal: true

module Gateways
  module BankSlip
    Capabilities = Data.define(
      :inline_pix,
      :native_notifications,
      :cancellation,
      :fine_and_interest,
      :past_due_reissue
    ) do
      def self.full
        new(
          inline_pix: true,
          native_notifications: false,
          cancellation: true,
          fine_and_interest: true,
          past_due_reissue: true
        )
      end
    end
  end
end
