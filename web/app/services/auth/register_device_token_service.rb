# frozen_string_literal: true

module Auth
  class RegisterDeviceTokenService < ApplicationService
    def initialize(user:, token:, platform:)
      @user = user
      @token = token
      @platform = platform
    end

    def call
      device_token = user.device_tokens.kept.find_or_initialize_by(token: token)
      device_token.platform = platform

      if device_token.save
        ResponseService.success(data: device_token)
      else
        ResponseService.failure(code: :validation_failed, details: device_token.errors.to_hash)
      end
    end

    private

    attr_reader :user, :token, :platform
  end
end
