# frozen_string_literal: true

module Gateways
  module PlatformSubscription
    class Registry
      ADAPTERS = {
        "manual" => Manual,
        "fake" => Fake,
        "asaas" => Asaas::Adapter
      }.freeze

      class UnknownProviderError < Error; end

      class << self
        def current
          self.for(active_provider)
        end

        def for(provider)
          adapter_class = ADAPTERS[provider.to_s]
          raise UnknownProviderError, "No platform subscription adapter for #{provider.inspect}" unless adapter_class

          adapter_class.new
        end

        def registered?(provider)
          ADAPTERS.key?(provider.to_s)
        end

        def active_provider
          ENV["PLATFORM_BILLING_PROVIDER"].presence || PlatformBillingSetting.instance.active_provider
        end

        def resolve(provider:)
          self.for(provider)
        end

        def current_provider
          active_provider
        end
      end
    end
  end
end
