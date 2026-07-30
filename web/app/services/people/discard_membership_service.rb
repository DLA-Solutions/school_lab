# frozen_string_literal: true

module People
  class DiscardMembershipService < ApplicationService
    def initialize(membership:)
      @membership = membership
    end

    def call
      return ResponseService.failure(code: :invalid_state_transition) if membership.discarded?

      membership.discard
      ResponseService.success
    end

    private

    attr_reader :membership
  end
end
