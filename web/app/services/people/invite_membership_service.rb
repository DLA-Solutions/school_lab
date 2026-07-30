# frozen_string_literal: true

module People
  class InviteMembershipService < ApplicationService
    def initialize(membership:)
      @membership = membership
    end

    def call
      return ResponseService.failure(code: :invalid_state_transition) unless membership.invited?

      People::InviteMembershipNotificationJob.perform_later(membership.id)
      ResponseService.success(data: membership)
    end

    private

    attr_reader :membership
  end
end
