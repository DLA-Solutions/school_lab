# frozen_string_literal: true

require "uri"

module SchoolLab
  module Integrations
    module Inter
      class Client
        # Inter's OAuth scopes for the cobrança (boleto/Pix) resource. Unlike Cora, the token
        # request is scoped explicitly — a token minted without these scopes is accepted by the
        # token endpoint but rejected by the cobrança endpoints with 403.
        SCOPE = "boleto-cobranca.read boleto-cobranca.write"

        def initialize(client_id:, client_secret:, certificate_pem:, private_key_pem:, token_cache:,
                       billing_urls: Configuration.current)
          @client_id = client_id
          @client_secret = client_secret
          @certificate_pem = certificate_pem
          @private_key_pem = private_key_pem
          @token_cache = token_cache
          @billing_urls = billing_urls
        end

        def get(path)
          request(:get, path)
        end

        def post(path, body: nil, content_type: "application/json")
          request(:post, path, body: body, content_type: content_type)
        end

        def delete(path)
          request(:delete, path)
        end

        private

        attr_reader :client_id, :client_secret, :certificate_pem, :private_key_pem, :token_cache, :billing_urls

        def request(method, path, body: nil, content_type: "application/json", retried: false)
          response = SchoolLab::Http.execute do
            authenticated_request(method, path, body: body, content_type: content_type)
          end

          if response.status == 401 && !retried
            token_cache.delete
            return request(method, path, body: body, content_type: content_type, retried: true)
          end

          map_response!(response)
        rescue SchoolLab::Http::ConnectionError
          raise TransientError, "Provider connection error"
        end

        def authenticated_request(method, path, body:, content_type:)
          token = access_token
          headers = { "Authorization" => "Bearer #{token}" }
          headers["Content-Type"] = content_type if body

          api_connection.run_request(method, path, body, headers)
        end

        def access_token
          token_cache.fetch { fetch_access_token }
        end

        def fetch_access_token
          SchoolLab::Http.execute do
            token_connection.post(token_path) do |request|
              request.headers["Content-Type"] = "application/x-www-form-urlencoded"
              request.body = URI.encode_www_form(
                grant_type: "client_credentials",
                client_id: client_id,
                client_secret: client_secret,
                scope: SCOPE
              )
            end
          end.then { |response| map_token_response!(response) }
        rescue SchoolLab::Http::ConnectionError
          raise TransientError, "Provider connection error"
        end

        # mTLS applies to the token request too — Inter authenticates the client certificate on
        # every call, including the one that mints the token.
        def api_connection
          @api_connection ||= build_connection(billing_urls.fetch(:api_base_url))
        end

        def token_connection
          @token_connection ||= build_connection(token_base_url)
        end

        def token_base_url
          uri = token_uri
          "#{uri.scheme}://#{uri.host}:#{uri.port}"
        end

        def token_path
          token_uri.request_uri
        end

        def token_uri
          @token_uri ||= URI(billing_urls.fetch(:token_url))
        end

        def build_connection(base_url)
          SchoolLab::Http.build_connection(
            base_url: base_url,
            certificate_pem: certificate_pem,
            private_key_pem: private_key_pem,
            open_timeout: Configuration::CONNECT_TIMEOUT,
            read_timeout: Configuration::READ_TIMEOUT
          )
        end

        def map_token_response!(response)
          case response.status
          when 200
            payload = JSON.parse(response.body)
            token = payload.fetch("access_token")
            expires_in = payload.fetch("expires_in", 86_400)
            token_cache.write(token, expires_in: Configuration.token_cache_ttl(expires_in))
          else
            map_response!(response)
          end
        rescue JSON::ParserError
          raise UnexpectedResponseError, "Invalid token response from provider"
        end

        def map_response!(response)
          code = response.status
          body = response.body.to_s

          case code
          when 200..299
            body
          when 400, 422
            raise ValidationError.new("Provider validation error", details: safe_error_body(body))
          when 401, 403
            raise AuthenticationError, "Provider authentication failed (#{code})"
          when 500..599
            raise TransientError, "Provider server error (#{code})"
          else
            raise UnexpectedResponseError, "Unexpected provider response (#{code})"
          end
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
