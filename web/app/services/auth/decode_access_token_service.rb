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
      SigningSecret.fetch
    end
  end
end
