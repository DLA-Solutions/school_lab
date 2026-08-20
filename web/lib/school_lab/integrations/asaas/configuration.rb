# frozen_string_literal: true

module SchoolLab
  module Integrations
    module Asaas
      module Configuration
        CONNECT_TIMEOUT = 5
        READ_TIMEOUT = 15
        DEFAULT_BASE_URL = "https://api.asaas.com"

        module_function

        def current
          { api_token: api_token, api_base_url: api_base_url }
        end

        def api_base_url
          (ENV["ASAAS_API_BASE_URL"].presence || DEFAULT_BASE_URL).chomp("/")
        end

        def api_token
          token = ENV["ASAAS_API_TOKEN"]
          raise ConfigurationError, "ASAAS_API_TOKEN is not configured" if token.blank?

          token
        end
      end
    end
  end
end
