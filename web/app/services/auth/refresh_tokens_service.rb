# frozen_string_literal: true

module Auth
  class RefreshTokensService < ApplicationService
    REFRESH_TTL = 90.days
    REMEMBER_ME_TTL = 180.days

    def initialize(refresh_token:, remember_me: false)
      @refresh_token = refresh_token
      @remember_me = remember_me
    end

    def call
      return ResponseService.failure(code: :unauthorized) if refresh_token.blank?

      digest = Digest::SHA256.hexdigest(refresh_token)
      record = RefreshToken.active.find_by(token_digest: digest)
      return ResponseService.failure(code: :unauthorized) unless record

      user = record.user
      return ResponseService.failure(code: :unauthorized) unless user.kept? && user.active_for_authentication?

      ActiveRecord::Base.transaction do
        record.update!(revoked_at: Time.current)
        issue_result = Auth::IssueTokensService.call(user: user, remember_me: remember_me)
        issue_result
      end
    end

    private

    attr_reader :refresh_token, :remember_me
  end
end
