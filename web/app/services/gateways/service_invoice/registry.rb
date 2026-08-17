# frozen_string_literal: true

module Gateways
  module ServiceInvoice
    class Registry
      INSTRUMENT = "service_invoice"

      ADAPTERS = {
        "fake" => Fake,
        "spedy" => Spedy::Adapter
      }.freeze

      API_SELECTABLE_PROVIDERS = %w[spedy].freeze

      class UnknownProviderError < Gateways::ServiceInvoice::Error; end

      class << self
        def resolve(school:, provider:)
          adapter_class = ADAPTERS[provider]
          unless adapter_class
            raise UnknownProviderError, "No service invoice adapter registered for provider #{provider.inspect}"
          end

          adapter_class.new(school: school)
        end

        def registered?(provider)
          ADAPTERS.key?(provider)
        end

        def api_selectable?(provider)
          API_SELECTABLE_PROVIDERS.include?(provider)
        end

        def active_config(school:, instrument: INSTRUMENT)
          config = SchoolPaymentProvider.active.find_by(school_id: school.id, instrument: instrument)
          return config if config

          log_missing_configuration(school: school, instrument: instrument)
          raise UnknownProviderError, missing_configuration_message(school, instrument)
        end

        private

        def missing_configuration_message(school, instrument)
          inactive = SchoolPaymentProvider.where(school_id: school.id, instrument: instrument).count
          reason = inactive.zero? ? "no credentials were ever uploaded" : "#{inactive} inactive one(s) exist"

          "No active #{instrument} configuration for school #{school.id} " \
            "(#{reason}) — upload fiscal credentials for this school"
        end

        def log_missing_configuration(school:, instrument:)
          Rails.logger.error(
            {
              event: "service_invoice.configuration_missing",
              school_id: school.id,
              instrument: instrument
            }.to_json
          )
        end
      end
    end
  end
end
