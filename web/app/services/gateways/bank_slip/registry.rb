# frozen_string_literal: true

module Gateways
  module BankSlip
    class Registry
      INSTRUMENT = "bank_slip"

      ADAPTERS = {
        "fake" => Fake,
        "cora" => Cora::Adapter,
        "inter" => Inter::Adapter
      }.freeze

      # Which of those an API caller may register for a school. `fake` stays a registered adapter
      # — seeds and factories create rows with it — but it reports success and fabricates a boleto
      # that collects nothing, so letting a caller point a school at it would silently stop that
      # school from being paid. Listed explicitly instead of derived from ADAPTERS: a new adapter
      # is not offered to callers until someone decides it collects real money. `inter` was
      # added once the school-facing credentials upload was requested explicitly.
      API_SELECTABLE_PROVIDERS = %w[cora inter].freeze

      # Providers whose adapter reports `capabilities.boleto_pdf`. Kept here so callers that only
      # hold a ChargeIssuance (a serializer rendering a list, say) can ask without building an
      # adapter — which would load credentials and open an mTLS client. A spec keeps this list in
      # step with the adapters' own `capabilities`.
      BOLETO_PDF_PROVIDERS = %w[inter fake].freeze

      class UnknownProviderError < Gateways::BankSlip::Error; end

      class << self
        # There is no default provider: `provider` is required so no caller can silently get
        # the fake adapter, which reports success and fabricates a boleto that collects nothing.
        def resolve(school:, provider:)
          adapter_class = ADAPTERS[provider]
          raise UnknownProviderError, "No bank slip adapter registered for provider #{provider.inspect}" unless adapter_class

          adapter_class.new(school: school)
        end

        def registered?(provider)
          ADAPTERS.key?(provider)
        end

        def boleto_pdf?(provider)
          BOLETO_PDF_PROVIDERS.include?(provider)
        end

        def api_selectable?(provider)
          API_SELECTABLE_PROVIDERS.include?(provider)
        end

        # A school has one configuration per instrument. Credentials are validated for
        # completeness on write, so an active row is always usable.
        def active_config(school:, instrument: INSTRUMENT)
          config = SchoolPaymentProvider.active.find_by(school_id: school.id, instrument: instrument)
          return config if config

          log_missing_configuration(school: school, instrument: instrument)
          raise UnknownProviderError, missing_configuration_message(school, instrument)
        end

        private

        # Says what the operator has to do, so going live does not require reading code.
        def missing_configuration_message(school, instrument)
          inactive = SchoolPaymentProvider.where(school_id: school.id, instrument: instrument).count
          reason = inactive.zero? ? "no credentials were ever uploaded" : "#{inactive} inactive one(s) exist"

          "No active #{instrument} configuration for school #{school.id} " \
            "(#{reason}) — upload current bank credentials for this school"
        end

        def log_missing_configuration(school:, instrument:)
          Rails.logger.error(
            {
              event: "bank_slip.configuration_missing",
              school_id: school.id,
              instrument: instrument
            }.to_json
          )
        end
      end
    end
  end
end
