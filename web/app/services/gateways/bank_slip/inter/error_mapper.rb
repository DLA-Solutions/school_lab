# frozen_string_literal: true

module Gateways
  module BankSlip
    module Inter
      module ErrorMapper
        module_function

        def map(error)
          case error
          when SchoolLab::Integrations::Inter::ConfigurationError
            raise Gateways::BankSlip::ProviderError.new(error.message, **diagnostics(error))
          when SchoolLab::Integrations::Inter::ValidationError
            raise Gateways::BankSlip::ValidationError.new(error.message, details: error.details, **diagnostics(error))
          when SchoolLab::Integrations::Inter::AuthenticationError
            raise Gateways::BankSlip::AuthenticationError.new(error.message, **diagnostics(error))
          when SchoolLab::Integrations::Inter::TransientError
            raise Gateways::BankSlip::TransientError.new(error.message, **diagnostics(error))
          when SchoolLab::Integrations::Inter::UnexpectedResponseError
            raise Gateways::BankSlip::ProviderError.new(error.message, **diagnostics(error))
          when SchoolLab::Http::ConnectionError
            raise Gateways::BankSlip::TransientError.new("Provider connection error", **diagnostics(error))
          else
            raise error
          end
        end

        # The provider's HTTP status and response body (or, for transport failures, the root
        # cause), forwarded onto the port error.
        def diagnostics(error)
          if error.is_a?(SchoolLab::Http::ConnectionError)
            { cause_class: error.cause_class, cause_message: error.cause_message }
          else
            { http_status: error.http_status, provider_response: error.provider_response,
              cause_class: error.cause_class, cause_message: error.cause_message }
          end
        end
      end
    end
  end
end
