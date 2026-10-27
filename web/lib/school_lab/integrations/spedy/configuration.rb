# frozen_string_literal: true

module SchoolLab
  module Integrations
    module Spedy
      module Configuration
        # Includes the API version segment. Client paths are relative to it (no leading slash), so
        # Faraday appends them instead of replacing the base path.
        DEFAULT_API_BASE_URL = "https://api.spedy.com.br/v1"
        CONNECT_TIMEOUT = 10
        READ_TIMEOUT = 30

        module_function

        # `SPEDY_API_BASE_URL` may override the default; an unset or blank value never raises.
        def current
          { api_base_url: normalize_base_url(ENV["SPEDY_API_BASE_URL"]) || DEFAULT_API_BASE_URL }
        end

        # Strips whitespace and trailing slashes; nil when blank.
        def normalize_base_url(value)
          value.to_s.strip.sub(%r{/+\z}, "").presence
        end

        # A per-school override must be an https URL with a real host: no credentials in the URL,
        # no IP literals or localhost, so a school cannot point the platform at internal services.
        def valid_base_url?(value)
          uri = URI.parse(value.to_s)
          return false unless uri.is_a?(URI::HTTPS) && uri.host.present? && uri.userinfo.nil?
          return false if uri.query || uri.fragment

          host = uri.host.downcase
          !(host == "localhost" || host.end_with?(".localhost") || host.match?(/\A[\d.]+\z/) || host.include?(":"))
        rescue URI::InvalidURIError
          false
        end

        def platform_api_key
          ENV.fetch("SPEDY_PLATFORM_API_KEY") { raise ConfigurationError, "SPEDY_PLATFORM_API_KEY is not configured" }
        end

        def webhook_token
          ENV["SPEDY_WEBHOOK_TOKEN"]
        end
      end
    end
  end
end
