# frozen_string_literal: true

module Gateways
  module PlatformSubscription
    module Asaas
      module ErrorMapper
        module_function

        def map(error)
          case error
          when SchoolLab::Integrations::Asaas::ConfigurationError
            raise AuthenticationError, error.message
          when SchoolLab::Integrations::Asaas::ValidationError
            raise ValidationError.new(error.message, details: error.details)
          when SchoolLab::Integrations::Asaas::AuthenticationError
            raise AuthenticationError, error.message
          when SchoolLab::Integrations::Asaas::TransientError, SchoolLab::Http::ConnectionError
            raise TransientError, "Provider connection error"
          when SchoolLab::Integrations::Asaas::UnexpectedResponseError
            raise ProviderError, error.message
          when SchoolLab::Integrations::Asaas::Error
            raise ProviderError, error.message
          else
            raise error
          end
        end
      end
    end
  end
end
