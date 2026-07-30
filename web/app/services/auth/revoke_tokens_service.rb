# frozen_string_literal: true

module Auth
  class RevokeTokensService < ApplicationService
    def initialize(user:, refresh_token: nil)
      @user = user
      @refresh_token = refresh_token
    end

    def call
      if refresh_token.present?
        digest = Digest::SHA256.hexdigest(refresh_token)
        user.refresh_tokens.active.where(token_digest: digest).update_all(revoked_at: Time.current)
      else
        user.refresh_tokens.active.update_all(revoked_at: Time.current)
      end

      ResponseService.success
    end

    private

    attr_reader :user, :refresh_token
  end
end
