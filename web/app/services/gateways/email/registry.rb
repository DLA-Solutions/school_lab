# frozen_string_literal: true

module Gateways
  module Email
    class Registry
      ADAPTERS = {
        "fake" => Fake,
        "postmark" => Postmark::Adapter
      }.freeze

      class << self
        def current
          @current ||= build_adapter
        end

        def current=(adapter)
          @current = adapter
        end

        def reset!
          @current = nil
        end

        def resolve(provider)
          adapter_class = ADAPTERS[provider.to_s]
          raise ProviderError, "No email adapter registered for provider #{provider.inspect}" unless adapter_class

          adapter_class.new
        end

        private

        def build_adapter
          if SchoolLab::EmailDelivery.local_delivery_enabled? || !SchoolLab::EmailDelivery.provider_configured?
            Fake.new
          else
            Postmark::Adapter.new
          end
        end
      end
    end
  end
end
