# frozen_string_literal: true

module Auth
  class EncodeAccessTokenService < ApplicationService
    ACCESS_TTL = 20.minutes

    def initialize(user:)
      @user = user
    end

    def call
      issued_at = Time.current
      expires_at = issued_at + ACCESS_TTL
      payload = {
        sub: user.id.to_s,
        iat: issued_at.to_i,
        exp: expires_at.to_i
      }

      token = JWT.encode(payload, secret, "HS256")

      ResponseService.success(
        data: {
          access_token: token,
          access_expires_at: expires_at.iso8601
        }
      )
    end

    private

    attr_reader :user

    def secret
      SigningSecret.fetch
    end
  end
end
