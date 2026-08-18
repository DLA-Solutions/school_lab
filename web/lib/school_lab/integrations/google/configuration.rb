# frozen_string_literal: true

module SchoolLab
  module Integrations
    module Google
      module Configuration
        CONNECT_TIMEOUT = 5
        READ_TIMEOUT = 10
        JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs"
        JWKS_CACHE_KEY = "school_lab/integrations/google/jwks"
        JWKS_CACHE_TTL = 1.hour

        module_function

        def client_ids
          raw = ENV.fetch("GOOGLE_OAUTH_CLIENT_IDS", ENV["GOOGLE_OAUTH_CLIENT_ID"]).to_s
          ids = raw.split(",").map(&:strip).reject(&:blank?)
          return ids if ids.any?

          raise ConfigurationError, "GOOGLE_OAUTH_CLIENT_ID must be set"
        end
      end
    end
  end
end
