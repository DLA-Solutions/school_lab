# frozen_string_literal: true

module Gateways
  module BankSlip
    module Inter
      module ErrorMapper
        module_function

        def map(error)
          case error
          when SchoolLab::Integrations::Inter::ConfigurationError
            raise Gateways::BankSlip::ProviderError, error.message
          when SchoolLab::Integrations::Inter::ValidationError
            raise Gateways::BankSlip::ValidationError.new(error.message, details: error.details)
          when SchoolLab::Integrations::Inter::AuthenticationError
            raise Gateways::BankSlip::AuthenticationError, error.message
          when SchoolLab::Integrations::Inter::TransientError
            raise Gateways::BankSlip::TransientError, error.message
          when SchoolLab::Integrations::Inter::UnexpectedResponseError
            raise Gateways::BankSlip::ProviderError, error.message
          when SchoolLab::Http::ConnectionError
            raise Gateways::BankSlip::TransientError, "Provider connection error"
          else
            raise error
          end
        end
      end
    end
  end
end
