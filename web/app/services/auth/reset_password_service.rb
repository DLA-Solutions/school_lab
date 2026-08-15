# frozen_string_literal: true

module Auth
  # Completes what `RequestPasswordResetService` started: the token from the mail is exchanged for
  # a new password.
  #
  # Unauthenticated by necessity — whoever is doing this cannot sign in, which is the whole point.
  # The token is the only credential, so it is single-use and expires on Devise's own window.
  class ResetPasswordService < ApplicationService
    def initialize(token:, password:, password_confirmation: nil)
      @token = token.to_s
      @password = password
      @password_confirmation = password_confirmation.presence || password
    end

    def call
      return invalid_token if token.blank?

      user = User.with_reset_password_token(token)
      return invalid_token if user.blank?
      return invalid_token unless user.reset_password_period_valid?
      return invalid_token if user.disabled? || user.discarded?

      unless user.reset_password(password, password_confirmation)
        return ResponseService.failure(code: :validation_error, details: user.errors.to_hash)
      end

      # Every session opened with the old password stops here: a reset is what someone does when
      # they think the old one is no longer theirs alone.
      Auth::RevokeTokensService.call(user: user)

      ResponseService.success(data: { user_id: user.id })
    end

    private

    attr_reader :token, :password, :password_confirmation

    # One answer for an unknown token, an expired one and a used one alike. Telling them apart
    # says whether a given token ever existed, and none of the three is recoverable anyway.
    def invalid_token
      ResponseService.failure(
        code: :validation_error,
        details: { token: [ I18n.t("api.errors.invalid_reset_token") ] }
      )
    end
  end
end
