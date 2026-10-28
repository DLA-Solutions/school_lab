# frozen_string_literal: true

module SchoolLab
  module Integrations
    module Inter
      class ValidationError < Error
        attr_reader :details

        def initialize(message = "Provider validation error", details: nil, http_status: nil, provider_response: nil)
          super(message, http_status: http_status, provider_response: provider_response)
          @details = details
        end
      end
    end
  end
end
