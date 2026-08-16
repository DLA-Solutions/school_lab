# frozen_string_literal: true

module GuardianRequests
  # Ending a request: the school either met it or refused it.
  #
  # A refusal must carry a reason. The guardian is told the answer and will ask why, and "no"
  # with nothing after it leaves whoever fields that call with nothing to say. Meeting a request
  # needs no note — the declaration itself is the answer.
  class ResolveGuardianRequestService < ApplicationService
    EVENTS = %i[fulfill reject].freeze

    def initialize(request:, event:, actor:, resolution_note: nil)
      @request = request
      @event = event.to_sym
      @actor = actor
      @resolution_note = resolution_note
    end

    def call
      return ResponseService.failure(code: :invalid_state_transition) unless EVENTS.include?(event)
      return ResponseService.failure(code: :invalid_state_transition) unless request.public_send(:"may_#{event}?")

      if event == :reject && resolution_note.blank?
        return ResponseService.failure(
          code: :validation_error,
          details: { resolution_note: [ I18n.t("errors.messages.blank") ] }
        )
      end

      request.resolution_note = resolution_note.presence
      request.resolved_by = actor
      request.resolved_at = Time.current
      request.public_send(:"#{event}!")

      ResponseService.success(data: request)
    end

    private

    attr_reader :request, :event, :actor, :resolution_note
  end
end
