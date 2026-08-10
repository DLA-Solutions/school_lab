# frozen_string_literal: true

module People
  class InviteMembershipService < ApplicationService
    def initialize(membership:, inviter: nil)
      @membership = membership
      @inviter = inviter
    end

    def call
      unless membership.invited?
        return ResponseService.failure(
          code: :validation_error,
          details: { status: [ "must be invited to resend invite" ] }
        )
      end

      token_result = Identity::IssueMembershipInviteTokenService.call(membership: membership, inviter: inviter)
      return token_result if token_result.failure?

      People::InviteMembershipNotificationJob.perform_later(membership.id, token_result.data[:raw_token])
      ResponseService.success(data: membership)
    end

    private

    attr_reader :membership, :inviter
  end
end
