# frozen_string_literal: true

module SchoolLab
  module Integrations
    module Cora
      module Configuration
        CONNECT_TIMEOUT = 5
        READ_TIMEOUT = 10
        TOKEN_SAFETY_MARGIN_SECONDS = 300

        module_function

        def current
          api_base_url = ENV["CORA_API_BASE_URL"]
          token_url = ENV["CORA_TOKEN_URL"]

          if api_base_url.blank? || token_url.blank?
            raise ConfigurationError,
                  "CORA_API_BASE_URL and CORA_TOKEN_URL must be set"
          end

          { api_base_url: api_base_url.chomp("/"), token_url: token_url }
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
