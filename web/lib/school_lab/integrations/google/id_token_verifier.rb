# frozen_string_literal: true

require "jwt"

module SchoolLab
  module Integrations
    module Google
      class IdTokenVerifier
        ISSUERS = %w[accounts.google.com https://accounts.google.com].freeze

        TokenClaims = Data.define(:sub, :email, :email_verified)

        def initialize(client_ids: Configuration.client_ids, cache: Rails.cache, http_connection: nil)
          @client_ids = client_ids
          @cache = cache
          @http_connection = http_connection
        end

        def verify(id_token)
          raise InvalidTokenError if id_token.blank?

          payload, = JWT.decode(
            id_token,
            nil,
            true,
            algorithms: %w[RS256],
            iss: ISSUERS,
            verify_iss: true,
            aud: client_ids,
            verify_aud: true,
            jwks: jwks_keys
          )

          email_verified = payload["email_verified"] == true || payload["email_verified"] == "true"
          raise InvalidTokenError unless email_verified

          email = payload["email"].to_s.downcase.strip
          raise InvalidTokenError if email.blank? || payload["sub"].blank?

          TokenClaims.new(
            sub: payload["sub"].to_s,
            email: email,
            email_verified: true
          )
        rescue JWT::DecodeError, JWT::VerificationError, JWT::ExpiredSignature
          raise InvalidTokenError
        rescue SchoolLab::Http::ConnectionError
          raise InvalidTokenError
        end

        private

        attr_reader :client_ids, :cache, :http_connection

        def jwks_keys
          cached = cache.read(Configuration::JWKS_CACHE_KEY)
          return cached if cached.present?

          body = fetch_jwks
          keys = JWT::JWK::Set.new(JSON.parse(body))
          cache.write(Configuration::JWKS_CACHE_KEY, keys, expires_in: Configuration::JWKS_CACHE_TTL)
          keys
        end

        def fetch_jwks
          response = SchoolLab::Http.execute do
            connection.get("/oauth2/v3/certs")
          end
          raise InvalidTokenError unless response.success?

          response.body
        end

        def connection
          @http_connection ||= SchoolLab::Http.build_connection(
            base_url: "https://www.googleapis.com",
            open_timeout: Configuration::CONNECT_TIMEOUT,
            read_timeout: Configuration::READ_TIMEOUT
          )
        end
      end
    end
  end
end
