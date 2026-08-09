# frozen_string_literal: true

module Gateways
  module Signature
    class Registry
      ADAPTERS = {
        "fake" => Fake,
        "autentique" => Autentique::Adapter
      }.freeze

      # Which of those an operator may register for a school. `fake` stays a registered adapter —
      # seeds and specs use it — but it fabricates a document nobody signs, so pointing a real
      # school at it would leave contracts that look sent and are not.
      API_SELECTABLE_PROVIDERS = %w[autentique].freeze

      class UnknownProviderError < Gateways::Signature::Error; end
      class MissingConfigurationError < Gateways::Signature::Error; end

      class << self
        def resolve(school:, config:)
          adapter_class = ADAPTERS[config.provider]
          unless adapter_class
            raise UnknownProviderError,
                  "No signature adapter registered for provider #{config.provider.inspect}"
          end

          adapter_class.new(school: school, config: config)
        end

        # Says what the operator has to do, so going live does not require reading code.
        def active_config(school:)
          config = SchoolSignatureProvider.active.find_by(school_id: school.id)
          return config if config

          Rails.logger.error(
            { event: "signature.configuration_missing", school_id: school.id }.to_json
          )

          raise MissingConfigurationError,
                "No active signature configuration for school #{school.id} — " \
                "register the school's Autentique API token before sending contracts"
        end

        def api_selectable?(provider)
          API_SELECTABLE_PROVIDERS.include?(provider.to_s)
        end
      end
    end
  end
end
