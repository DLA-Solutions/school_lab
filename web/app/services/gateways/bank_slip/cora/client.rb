# frozen_string_literal: true

require "net/http"
require "uri"

module Gateways
  module BankSlip
    module Cora
      class Client
        def self.for_school(school:, environment: "stage")
          config = Gateways::BankSlip::Registry.active_config(school: school, environment: environment)
          token_cache = TokenCache.new(
            school_id: school.id,
            provider: config.provider,
            environment: config.environment
          )
          new(config: config, token_cache: token_cache)
        end

        def initialize(config:, token_cache:)
          @config = config
          @token_cache = token_cache
          @environment_config = Configuration.for_environment(config.environment)
        end

        def get(path)
          request(:get, path)
        end

        def post(path, body: nil, content_type: "application/json")
          request(:post, path, body: body, content_type: content_type)
        end

        private

        attr_reader :config, :token_cache, :environment_config

        def request(method, path, body: nil, content_type: "application/json", retried: false)
          response = with_connection_rescue do
            authenticated_request(method, path, body: body, content_type: content_type)
          end

          if response.code.to_i == 401 && !retried
            token_cache.delete
            return request(method, path, body: body, content_type: content_type, retried: true)
          end

          map_response!(response)
        end

        def authenticated_request(method, path, body:, content_type:)
          token = access_token
          uri = URI.join(environment_config.fetch(:api_base_url), path)
          http = build_http(uri)
          request = build_request(method, uri, body: body, content_type: content_type, token: token)
          http.request(request)
        end

        def access_token
          token_cache.fetch { fetch_access_token }
        end

        def fetch_access_token
          with_connection_rescue do
            uri = URI(environment_config.fetch(:token_url))
            http = build_http(uri)
            request = Net::HTTP::Post.new(uri)
            request["Content-Type"] = "application/x-www-form-urlencoded"
            request.body = URI.encode_www_form(grant_type: "client_credentials", client_id: config.client_id)
            http.request(request)
          end.then { |response| map_token_response!(response) }
        end

        def build_http(uri)
          http = Net::HTTP.new(uri.host, uri.port)
          http.use_ssl = true
          http.open_timeout = Configuration::CONNECT_TIMEOUT
          http.read_timeout = Configuration::READ_TIMEOUT
          http.cert = OpenSSL::X509::Certificate.new(config.certificate_pem)
          http.key = OpenSSL::PKey.read(config.private_key_pem)
          http
        end

        def build_request(method, uri, body:, content_type:, token:)
          request_class = method == :get ? Net::HTTP::Get : Net::HTTP::Post
          request = request_class.new(uri)
          request["Authorization"] = "Bearer #{token}"
          request["Content-Type"] = content_type if body
          request.body = body if body
          request
        end

        def map_token_response!(response)
          case response.code.to_i
          when 200
            payload = JSON.parse(response.body)
            token = payload.fetch("access_token")
            expires_in = payload.fetch("expires_in", 86_400).to_i
            margin = Configuration::TOKEN_SAFETY_MARGIN_SECONDS
            token_cache.write(token, expires_in: [expires_in - margin, 60].max)
            token
          else
            map_response!(response)
          end
        rescue JSON::ParserError
          raise Gateways::BankSlip::ProviderError, "Invalid token response from provider"
        end

        def map_response!(response)
          code = response.code.to_i
          body = response.body.to_s

          case code
          when 200..299
            body
          when 400, 422
            raise Gateways::BankSlip::ValidationError.new("Provider validation error", details: safe_error_body(body))
          when 401, 403
            raise Gateways::BankSlip::AuthenticationError, "Provider authentication failed (#{code})"
          when 500..599
            raise Gateways::BankSlip::TransientError, "Provider server error (#{code})"
          else
            raise Gateways::BankSlip::ProviderError, "Unexpected provider response (#{code})"
          end
        end

        def with_connection_rescue
          yield
        rescue Net::OpenTimeout, Net::ReadTimeout, Errno::ECONNREFUSED, SocketError
          raise Gateways::BankSlip::TransientError, "Provider connection error"
        end

        def safe_error_body(body)
          JSON.parse(body)
        rescue JSON::ParserError
          { "message" => "unparseable provider error" }
        end
      end
    end
  end
end
