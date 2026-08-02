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
        # There is no default provider: `provider` is required so no caller can silently get
        # the fake adapter, which reports success and fabricates a boleto that collects nothing.
        # `environment` is per school and lives on the active school_payment_providers row —
        # leave it nil so adapters derive it from that row instead of assuming one.
        def resolve(school:, provider:, environment: nil)
          adapter_class = ADAPTERS[provider]
          raise UnknownProviderError, "No bank slip adapter registered for provider #{provider.inspect}" unless adapter_class

          adapter_class.new(school: school, environment: environment)
        end

        def registered?(provider)
          ADAPTERS.key?(provider)
        end

        # Without `environment`, the most recently created active row wins — a school may
        # keep a superseded stage row active while running production.
        def active_config(school:, instrument: INSTRUMENT, environment: nil)
          config = active_scope(school: school, instrument: instrument, environment: environment).first
          return config if config

          log_missing_configuration(school: school, instrument: instrument, environment: environment)
          raise UnknownProviderError, missing_configuration_message(school, instrument, environment)
        end

        private

        def active_scope(school:, instrument:, environment:)
          scope = SchoolPaymentProvider.active.where(school_id: school.id, instrument: instrument)
          scope = scope.where(environment: environment) if environment
          scope.order(created_at: :desc, id: :desc)
        end

        def missing_configuration_message(school, instrument, environment)
          suffix = environment ? " (#{environment})" : ""
          "No active #{instrument} configuration for school #{school.id}#{suffix}"
        end

        def log_missing_configuration(school:, instrument:, environment:)
          Rails.logger.error(
            {
              event: "bank_slip.configuration_missing",
              school_id: school.id,
              instrument: instrument,
              environment: environment
            }.to_json
          )
        end
      end
    end
  end
end
