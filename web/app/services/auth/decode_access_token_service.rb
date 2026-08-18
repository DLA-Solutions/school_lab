# frozen_string_literal: true

module Auth
  class DecodeAccessTokenService < ApplicationService
    TokenContext = Data.define(:user, :impersonation_session, :impersonation_operator, :school, :membership)

    def initialize(token:)
      @token = token
    end

    def call
      payload, = JWT.decode(token, secret, true, algorithm: "HS256")

      if payload["impersonation_session_id"].present?
        decode_impersonation(payload)
      else
        decode_standard(payload)
      end
    rescue JWT::DecodeError, JWT::ExpiredSignature
      ResponseService.failure(code: :unauthorized)
    end

    private

    attr_reader :token

    def decode_standard(payload)
      user = User.kept.find_by(id: payload["sub"])
      return ResponseService.failure(code: :unauthorized) unless user

      ResponseService.success(
        data: TokenContext.new(
          user: user,
          impersonation_session: nil,
          impersonation_operator: nil,
          school: nil,
          membership: nil
        )
      )
    end

    def decode_impersonation(payload)
      session = PlatformImpersonationSession.find_by(id: payload["impersonation_session_id"])
      return ResponseService.failure(code: :unauthorized) unless session&.active?

      target_user = User.kept.find_by(id: payload["sub"])
      operator = User.kept.find_by(id: payload["impersonated_by"])
      school = School.kept.find_by(id: payload["school_id"])
      membership = session.target_membership

      unless target_user && operator && school && membership&.kept? && membership.active?
        return ResponseService.failure(code: :unauthorized)
      end

      unless session.target_user_id == target_user.id &&
             session.operator_user_id == operator.id &&
             session.school_id == school.id &&
             session.target_membership_id == membership.id
        return ResponseService.failure(code: :unauthorized)
      end

      ResponseService.success(
        data: TokenContext.new(
          user: target_user,
          impersonation_session: session,
          impersonation_operator: operator,
          school: school,
          membership: membership
        )
      )
    end

    def secret
      SigningSecret.fetch
    end
  end
end
