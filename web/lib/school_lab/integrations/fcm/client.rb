# frozen_string_literal: true

require "jwt"
require "openssl"
require "uri"

module SchoolLab
  module Integrations
    module Fcm
      class Client
        def initialize(client_email:, private_key:, project_id:, token_cache:)
          @client_email = client_email
          @private_key = private_key
          @project_id = project_id
          @token_cache = token_cache
        end

        # Sends one message to one device token. Returns the parsed JSON body
        # (`{"name" => "projects/.../messages/..."}`) on success.
        def send_message(token:, title:, body:, data: {})
          payload = build_payload(token: token, title: title, body: body, data: data)
          response = request(:post, "/v1/projects/#{project_id}/messages:send", body: payload.to_json)
          JSON.parse(response)
        rescue JSON::ParserError
          raise UnexpectedResponseError, "Invalid response from FCM"
        end

        private

        attr_reader :client_email, :private_key, :project_id, :token_cache

        def build_payload(token:, title:, body:, data:)
          {
            message: {
              token: token,
              notification: { title: title, body: body },
              data: stringify(data)
            }
          }
        end

        # FCM data payload values must all be strings.
        def stringify(data)
          data.to_h { |key, value| [ key.to_s, value.to_s ] }
        end

        def request(method, path, body:, retried: false)
          response = SchoolLab::Http.execute do
            authenticated_request(method, path, body: body)
          end

          if response.status == 401 && !retried
            token_cache.delete
            return request(method, path, body: body, retried: true)
          end

          map_response!(response)
        rescue SchoolLab::Http::ConnectionError
          raise TransientError, "Provider connection error"
        end

        def authenticated_request(method, path, body:)
          headers = { "Authorization" => "Bearer #{access_token}", "Content-Type" => "application/json" }
          api_connection.run_request(method, path, body, headers)
        end

        def access_token
          token_cache.fetch { fetch_access_token }
        end

        def fetch_access_token
          SchoolLab::Http.execute do
            token_connection.post(Configuration::TOKEN_PATH) do |request|
              request.headers["Content-Type"] = "application/x-www-form-urlencoded"
              request.body = URI.encode_www_form(
                grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
                assertion: signed_jwt
              )
            end
          end.then { |response| map_token_response!(response) }
        rescue SchoolLab::Http::ConnectionError
          raise TransientError, "Provider connection error"
        end

        # Self-signed JWT-bearer service-account flow: this app signs its own assertion (RS256,
        # the service account private key) instead of round-tripping through a user consent
        # screen — the standard machine-to-machine OAuth2 flow for a Google service account.
        def signed_jwt
          now = Time.now.to_i
          claims = {
            iss: client_email,
            scope: Configuration::SCOPE,
            aud: Configuration::TOKEN_AUDIENCE,
            iat: now,
            exp: now + 3600
          }
          JWT.encode(claims, OpenSSL::PKey::RSA.new(private_key), "RS256")
        end

        def api_connection
          @api_connection ||= SchoolLab::Http.build_connection(
            base_url: Configuration::API_BASE_URL,
            open_timeout: Configuration::CONNECT_TIMEOUT,
            read_timeout: Configuration::READ_TIMEOUT
          )
        end

        def token_connection
          @token_connection ||= SchoolLab::Http.build_connection(
            base_url: Configuration::TOKEN_BASE_URL,
            open_timeout: Configuration::CONNECT_TIMEOUT,
            read_timeout: Configuration::READ_TIMEOUT
          )
        end

        def map_token_response!(response)
          case response.status
          when 200
            payload = JSON.parse(response.body)
            token = payload.fetch("access_token")
            expires_in = payload.fetch("expires_in", 3599)
            token_cache.write(token, expires_in: Configuration.token_cache_ttl(expires_in))
          else
            map_response!(response)
          end
        rescue JSON::ParserError
          raise UnexpectedResponseError, "Invalid token response from provider"
        end

        # FCM's error body carries its own taxonomy under `error.details[].errorCode`
        # (`type.googleapis.com/google.firebase.fcm.v1.FcmError`), which is more precise than the
        # HTTP status alone — `UNREGISTERED` in particular needs its own error class regardless of
        # which status Google happens to answer with.
        def map_response!(response)
          code = response.status
          body = response.body.to_s
          return body if code.between?(200, 299)

          fcm_code = fcm_error_code(body)

          if fcm_code == "UNREGISTERED"
            raise UnregisteredTokenError, "FCM token no longer registered"
          elsif fcm_code.in?(%w[INVALID_ARGUMENT SENDER_ID_MISMATCH]) || code == 400
            raise ValidationError.new("Provider validation error", details: safe_error_body(body))
          elsif fcm_code.in?(%w[UNAUTHENTICATED PERMISSION_DENIED THIRD_PARTY_AUTH_ERROR]) || [ 401, 403 ].include?(code)
            raise AuthenticationError, "Provider authentication failed (#{code})"
          elsif fcm_code.in?(%w[QUOTA_EXCEEDED UNAVAILABLE INTERNAL]) || code == 429 || code.between?(500, 599)
            raise TransientError, "Provider error (#{code})"
          else
            raise UnexpectedResponseError, "Unexpected provider response (#{code})"
          end
        end

        def fcm_error_code(body)
          payload = JSON.parse(body)
          details = Array(payload.dig("error", "details"))
          fcm_detail = details.find { |detail| detail["@type"].to_s.include?("FcmError") }
          fcm_detail && fcm_detail["errorCode"]
        rescue JSON::ParserError
          nil
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
