# frozen_string_literal: true

module Gateways
  module BankSlip
    module Cora
      module Configuration
        ENVIRONMENTS = {
          "stage" => {
            api_base_url: "https://api.stage.cora.com.br",
            token_url: "https://matls-clients.api.stage.cora.com.br/token"
          },
          "production" => {
            api_base_url: "https://api.cora.com.br",
            token_url: "https://matls-clients.api.cora.com.br/token"
          }
        }.freeze

        CONNECT_TIMEOUT = 5
        READ_TIMEOUT = 10
        TOKEN_SAFETY_MARGIN_SECONDS = 300

        module_function

        def for_environment(environment)
          ENVIRONMENTS.fetch(environment) do
            raise Gateways::BankSlip::ProviderError, "Unknown Cora environment: #{environment.inspect}"
          end
        end

        # How long a token may be cached: the provider lifetime minus the safety margin.
        # Never longer than the provider allows, so a short-lived token is not cached at all.
        def token_cache_ttl(expires_in)
          [ expires_in.to_i - TOKEN_SAFETY_MARGIN_SECONDS, 0 ].max
        end
      end
    end
  end
end
