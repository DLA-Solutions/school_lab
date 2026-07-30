# frozen_string_literal: true

module Auth
  class IssueTokensService < ApplicationService
    REFRESH_TTL = 90.days
    REMEMBER_ME_TTL = 180.days

    def initialize(user:, remember_me: false, client: "mobile")
      @user = user
      @remember_me = remember_me
      @client = client
    end

    def call
      access_result = Auth::EncodeAccessTokenService.call(user: user)
      return access_result if access_result.failure?

      raw_refresh, refresh_record = create_refresh_token!
      data = access_result.data.merge(
        refresh_token: raw_refresh,
        refresh_expires_at: refresh_record.expires_at.iso8601,
        user: user
      )

      ResponseService.success(data: data)
    end

    private

    attr_reader :user, :remember_me, :client

    def create_refresh_token!
      raw_token = SecureRandom.urlsafe_base64(32)
      digest = Digest::SHA256.hexdigest(raw_token)
      ttl = remember_me ? REMEMBER_ME_TTL : REFRESH_TTL
      record = user.refresh_tokens.create!(
        token_digest: digest,
        expires_at: ttl.from_now,
        created_at: Time.current
      )
      [raw_token, record]
    end
  end
end
