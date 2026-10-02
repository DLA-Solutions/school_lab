# frozen_string_literal: true

module Gateways
  module Push
    module Fcm
      module ErrorMapper
        module_function

        def map(error)
          case error
          when SchoolLab::Integrations::Fcm::UnregisteredTokenError
            Gateways::Push::InvalidTokenError.new(error.message)
          when SchoolLab::Integrations::Fcm::ValidationError
            Gateways::Push::ValidationError.new(error.message)
          when SchoolLab::Integrations::Fcm::AuthenticationError
            Gateways::Push::AuthenticationError.new(error.message)
          when SchoolLab::Integrations::Fcm::TransientError, SchoolLab::Http::ConnectionError
            Gateways::Push::TransientError.new(error.message)
          when SchoolLab::Integrations::Fcm::ConfigurationError, SchoolLab::Integrations::Fcm::UnexpectedResponseError
            Gateways::Push::ProviderError.new(error.message)
          when SchoolLab::Integrations::Fcm::Error
            Gateways::Push::ProviderError.new(error.message)
          else
            raise error
          end
        end
      end
    end
  end
end
