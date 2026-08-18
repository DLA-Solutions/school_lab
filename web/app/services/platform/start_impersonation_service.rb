# frozen_string_literal: true

module Platform
  class StartImpersonationService < ApplicationService
    IMPERSONATION_TTL = 15.minutes

    def initialize(operator:, school_id:, target_membership_id:)
      @operator = operator
      @school_id = school_id
      @target_membership_id = target_membership_id
    end

    def call
      school = School.kept.find_by(id: school_id)
      return ResponseService.failure(code: :not_found) unless school

      membership = school.memberships.kept.active.find_by(id: target_membership_id)
      return ResponseService.failure(code: :not_found) unless membership

      return ResponseService.failure(code: :forbidden) unless impersonatable_membership?(membership)

      session = PlatformImpersonationSession.create!(
        operator_user: operator,
        target_user: membership.user,
        school: school,
        target_membership: membership,
        expires_at: Time.current + IMPERSONATION_TTL
      )

      token_result = Auth::EncodeImpersonationTokenService.call(session: session)
      return token_result if token_result.failure?

      ResponseService.success(
        data: {
          session: session,
          access_token: token_result.data[:access_token],
          access_expires_at: token_result.data[:access_expires_at]
        }
      )
    rescue ActiveRecord::RecordInvalid => e
      ResponseService.failure(code: :validation_error, details: e.record.errors.to_hash)
    end

    private

    attr_reader :operator, :school_id, :target_membership_id

    def impersonatable_membership?(membership)
      return false unless membership.staff_member?
      return false if membership.role == "guardian"

      profile = membership.staff_profile
      return false unless profile&.kept?

      system_key = profile.role_template&.system_key
      PlatformImpersonationSession::IMPERSONATABLE_SYSTEM_KEYS.include?(system_key)
    end
  end
end
