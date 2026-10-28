# frozen_string_literal: true

module Gateways
  module BankSlip
    # Port error base. `http_status` / `provider_response` are forwarded by adapter ErrorMappers
    # from the vendor error (nil when the vendor does not expose them, e.g. Cora or connection
    # failures) so callers can record why a provider call failed. Transport failures forward
    # `cause_class` / `cause_message` (the underlying TLS/timeout/DNS exception) instead.
    class Error < StandardError
      attr_reader :http_status, :provider_response, :cause_class, :cause_message

      def initialize(message = nil, http_status: nil, provider_response: nil, cause_class: nil,
                     cause_message: nil)
        super(message)
        @http_status = http_status
        @provider_response = provider_response
        @cause_class = cause_class
        @cause_message = cause_message
      end
    end
  end
end
