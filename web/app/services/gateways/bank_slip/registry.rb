# frozen_string_literal: true

module Gateways
  module BankSlip
    class Registry
      INSTRUMENT = "bank_slip"

      ADAPTERS = {
        "fake" => Fake,
        "cora" => Cora::Adapter
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

        def active_config(school:, instrument: INSTRUMENT, environment:)
          SchoolPaymentProvider.active.find_by!(
            school_id: school.id,
            instrument: instrument,
            environment: environment
          )
        rescue ActiveRecord::RecordNotFound
          raise UnknownProviderError,
                "No active #{instrument} configuration for school #{school.id} (#{environment})"
        end
      end
    end
  end
end
