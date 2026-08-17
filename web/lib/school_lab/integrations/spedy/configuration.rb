# frozen_string_literal: true

module SchoolLab
  module Integrations
    module Spedy
      module Configuration
        CONNECT_TIMEOUT = 10
        READ_TIMEOUT = 30

        module_function

        def current
          base_url = ENV.fetch("SPEDY_API_BASE_URL") { raise ConfigurationError, "SPEDY_API_BASE_URL is not configured" }
          { api_base_url: base_url }
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
