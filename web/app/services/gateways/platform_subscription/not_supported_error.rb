# frozen_string_literal: true

module Gateways
  module PlatformSubscription
    class NotSupportedError < Error
      attr_reader :error_code

      def initialize(message = "Not supported", error_code: :portal_not_supported)
        super(message)
        @error_code = error_code
      end
    end
  end
end
