# frozen_string_literal: true

module Gateways
  module PlatformSubscription
    module Iugu
      module ErrorMapper
        module_function

        def map(error)
          case error
          when SchoolLab::Integrations::Iugu::ConfigurationError
            raise AuthenticationError, error.message
          when SchoolLab::Integrations::Iugu::ValidationError
            raise ValidationError.new(error.message, details: error.details)
          when SchoolLab::Integrations::Iugu::AuthenticationError
            raise AuthenticationError, error.message
          when SchoolLab::Integrations::Iugu::TransientError, SchoolLab::Http::ConnectionError
            raise TransientError, "Provider connection error"
          when SchoolLab::Integrations::Iugu::UnexpectedResponseError
            raise ProviderError, error.message
          when SchoolLab::Integrations::Iugu::Error
            raise ProviderError, error.message
          else
            raise error
          end
        end
      end
    end
  end
end
