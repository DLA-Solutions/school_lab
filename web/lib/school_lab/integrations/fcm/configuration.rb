# frozen_string_literal: true

module SchoolLab
  module Integrations
    module Fcm
      module Configuration
        CONNECT_TIMEOUT = 5
        READ_TIMEOUT = 10
        TOKEN_SAFETY_MARGIN_SECONDS = 300

        API_BASE_URL = "https://fcm.googleapis.com"
        TOKEN_BASE_URL = "https://oauth2.googleapis.com"
        TOKEN_PATH = "/token"
        TOKEN_AUDIENCE = "https://oauth2.googleapis.com/token"
        SCOPE = "https://www.googleapis.com/auth/firebase.messaging"

        module_function

        def project_id
          ENV.fetch("FCM_PROJECT_ID") { raise ConfigurationError, "FCM_PROJECT_ID is not configured" }
        end

        def client_email
          ENV.fetch("FCM_CLIENT_EMAIL") { raise ConfigurationError, "FCM_CLIENT_EMAIL is not configured" }
        end

        # The env var commonly arrives with literal `\n` sequences (how most platforms let you set
        # a multi-line secret in a single-line field) rather than real newlines — unescape before
        # handing it to OpenSSL.
        def private_key
          raw = ENV.fetch("FCM_PRIVATE_KEY") { raise ConfigurationError, "FCM_PRIVATE_KEY is not configured" }
          raw.gsub('\\n', "\n")
        end

        # Non-raising — the gateway Registry uses this to pick Fake vs the real FCM adapter
        # (mirrors `SchoolLab::EmailDelivery.provider_configured?`).
        def configured?
          ENV["FCM_PROJECT_ID"].present? && ENV["FCM_CLIENT_EMAIL"].present? && ENV["FCM_PRIVATE_KEY"].present?
        end

        # How long an access token may be cached: the provider lifetime minus the safety margin.
        def token_cache_ttl(expires_in)
          [ expires_in.to_i - TOKEN_SAFETY_MARGIN_SECONDS, 0 ].max
        end
      end
    end
  end
end
