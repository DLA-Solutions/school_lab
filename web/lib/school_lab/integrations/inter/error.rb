# frozen_string_literal: true

module SchoolLab
  module Integrations
    module Inter
      # Base vendor error. Errors raised from a non-2xx provider response carry the HTTP status
      # and the response body (parsed JSON when possible, otherwise the truncated raw string) so
      # callers can diagnose failures. Request headers, tokens and credentials never live here.
      class Error < StandardError
        attr_reader :http_status, :provider_response

        def initialize(message = nil, http_status: nil, provider_response: nil)
          super(message)
          @http_status = http_status
          @provider_response = provider_response
        end
      end
    end
  end
end
