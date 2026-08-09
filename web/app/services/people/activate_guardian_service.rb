# frozen_string_literal: true

module People
  # Brings a guardian back by hand — a family that returned, or an automatic deactivation the
  # school wants to undo.
  class ActivateGuardianService < ApplicationService
    def initialize(guardian:, actor: nil)
      @guardian = guardian
      @actor = actor
    end

    def call
      return ResponseService.failure(code: :invalid_state_transition) unless guardian.discarded?

      guardian.discarded_by = nil
      guardian.discarded_at = nil
      # Without validation on purpose: a record that predates a later rule must still be
      # reactivatable, and the school fixes the missing fields afterwards.
      guardian.save(validate: false)

      Rails.logger.info(
        { event: "guardian.activated", guardian_id: guardian.id, actor_id: actor&.id }.to_json
      )

      ResponseService.success(data: guardian)
    end

    private

    attr_reader :guardian, :actor
  end
end
