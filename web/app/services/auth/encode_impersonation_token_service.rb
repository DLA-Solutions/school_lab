# frozen_string_literal: true

module Auth
  class EncodeImpersonationTokenService < ApplicationService
    IMPERSONATION_TTL = 15.minutes

    def initialize(session:)
      @session = session
    end

    def call
      issued_at = Time.current
      expires_at = session.expires_at
      payload = {
        sub: session.target_user_id.to_s,
        impersonated_by: session.operator_user_id.to_s,
        impersonation_session_id: session.id.to_s,
        school_id: session.school_id.to_s,
        membership_id: session.target_membership_id.to_s,
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

    attr_reader :session

    def secret
      SigningSecret.fetch
    end
  end
end
