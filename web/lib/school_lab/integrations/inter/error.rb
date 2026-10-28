# frozen_string_literal: true

module SchoolLab
  module Integrations
    module Inter
      # Base vendor error. Errors raised from a non-2xx provider response carry the HTTP status
      # and the response body (parsed JSON when possible, otherwise the truncated raw string) so
      # callers can diagnose failures. Request headers, tokens and credentials never live here.
      #
      # Transport failures (no HTTP response) carry the underlying exception instead:
      # `cause_class` / `cause_message` from SchoolLab::Http::ConnectionError, e.g. a TLS/mTLS
      # rejection or a timeout. Persisting layers redact and cap them.
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
end
