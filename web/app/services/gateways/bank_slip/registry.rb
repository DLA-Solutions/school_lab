# frozen_string_literal: true

module Gateways
  module BankSlip
    class Registry
      INSTRUMENT = "bank_slip"

      ADAPTERS = {
        "fake" => Fake
      }.freeze

      class UnknownProviderError < Gateways::BankSlip::Error; end

      class << self
        def resolve(school:, provider: default_provider)
          adapter_class = ADAPTERS[provider]
          raise UnknownProviderError, "No bank slip adapter registered for provider #{provider.inspect}" unless adapter_class

          adapter_class.new(school: school)
        end

        def registered?(provider)
          ADAPTERS.key?(provider)
        end

        def default_provider
          "fake"
        end
      end
    end
  end
end
