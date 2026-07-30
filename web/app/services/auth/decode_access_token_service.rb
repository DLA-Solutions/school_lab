# frozen_string_literal: true

module Auth
  class DecodeAccessTokenService < ApplicationService
    def initialize(token:)
      @token = token
    end

    def call
      payload, = JWT.decode(token, secret, true, algorithm: "HS256")
      user = User.kept.find_by(id: payload["sub"])
      return ResponseService.failure(code: :unauthorized) unless user

      ResponseService.success(data: user)
    rescue JWT::DecodeError, JWT::ExpiredSignature
      ResponseService.failure(code: :unauthorized)
    end

    private

    attr_reader :token

    def secret
      Rails.application.credentials.dig(:jwt, :secret_key) || ENV.fetch("JWT_SECRET_KEY", "test-secret-key")
    end
  end
end
