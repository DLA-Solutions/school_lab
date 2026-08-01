# frozen_string_literal: true

module Gateways
  module BankSlip
    class ValidationError < Error
      attr_reader :details

      def initialize(message = "Validation failed", details: nil)
        super(message)
        @details = details
      end
    end
  end
end
