# frozen_string_literal: true

module Gateways
  module BankSlip
    module Cora
      module ErrorMapper
        module_function

        def map(error)
          case error
          when SchoolLab::Integrations::Cora::ConfigurationError
            raise Gateways::BankSlip::ProviderError, error.message
          when SchoolLab::Integrations::Cora::ValidationError
            raise Gateways::BankSlip::ValidationError.new(error.message, details: error.details)
          when SchoolLab::Integrations::Cora::AuthenticationError
            raise Gateways::BankSlip::AuthenticationError, error.message
          when SchoolLab::Integrations::Cora::TransientError
            raise Gateways::BankSlip::TransientError, error.message
          when SchoolLab::Integrations::Cora::UnexpectedResponseError
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
