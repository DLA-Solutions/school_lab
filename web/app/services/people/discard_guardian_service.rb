# frozen_string_literal: true

module People
  class DiscardGuardianService < ApplicationService
    def initialize(guardian:, actor:)
      @guardian = guardian
      @actor = actor
    end

    def call
      return ResponseService.failure(code: :invalid_state_transition) if guardian.discarded?

      guardian.update!(discarded_by: actor)
      guardian.discard

      ResponseService.success
    end

    private

    attr_reader :guardian, :actor
  end
end
