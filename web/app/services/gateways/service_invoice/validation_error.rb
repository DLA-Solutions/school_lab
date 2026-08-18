# frozen_string_literal: true

module Gateways
  module ServiceInvoice
    class ValidationError < Error
      attr_reader :details

      def initialize(message = "Validation error", details: {})
        super(message)
        @details = details
      end
    end
  end
end
