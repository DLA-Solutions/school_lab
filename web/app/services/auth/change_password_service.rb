# frozen_string_literal: true

module Auth
  class ChangePasswordService < ApplicationService
    def initialize(user:, current_password:, password:, password_confirmation:)
      @user = user
      @current_password = current_password
      @password = password
      @password_confirmation = password_confirmation
    end

    def call
      return ResponseService.failure(code: :invalid_credentials) unless user.valid_password?(current_password)

      if user.update(password: password, password_confirmation: password_confirmation)
        Auth::RevokeTokensService.call(user: user)
        ResponseService.success
      else
        ResponseService.failure(code: :validation_failed, details: user.errors.to_hash)
      end
    end

    private

    attr_reader :user, :current_password, :password, :password_confirmation
  end
end
