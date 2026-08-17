# frozen_string_literal: true

module Gateways
  module ServiceInvoice
    module Spedy
      module ErrorMapper
        module_function

        def map(error)
          case error
          when SchoolLab::Integrations::Spedy::ValidationError
            Gateways::ServiceInvoice::ValidationError.new(error.message, details: error.details)
          when SchoolLab::Integrations::Spedy::AuthenticationError
            Gateways::ServiceInvoice::AuthenticationError.new(error.message)
          when SchoolLab::Integrations::Spedy::TransientError, SchoolLab::Http::ConnectionError
            Gateways::ServiceInvoice::TransientError.new(error.message)
          when SchoolLab::Integrations::Spedy::ConfigurationError, SchoolLab::Integrations::Spedy::UnexpectedResponseError
            Gateways::ServiceInvoice::ProviderError.new(error.message)
          when SchoolLab::Integrations::Spedy::Error
            Gateways::ServiceInvoice::ProviderError.new(error.message)
          else
            raise error
          end
        end
      end
    end
  end
end
