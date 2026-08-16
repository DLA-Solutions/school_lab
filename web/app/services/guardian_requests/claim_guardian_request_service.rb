# frozen_string_literal: true

module GuardianRequests
  # Picking a request up off the shared queue, or putting it back.
  #
  # Neither is an answer to the guardian, so neither touches the resolution — a request released
  # back to the queue has to look exactly like one nobody has touched yet.
  class ClaimGuardianRequestService < ApplicationService
    EVENTS = %i[start release].freeze

    def initialize(request:, event:)
      @request = request
      @event = event.to_sym
    end

    def call
      return ResponseService.failure(code: :invalid_state_transition) unless EVENTS.include?(event)
      return ResponseService.failure(code: :invalid_state_transition) unless request.public_send(:"may_#{event}?")

      request.public_send(:"#{event}!")

      ResponseService.success(data: request)
    end

    private

    attr_reader :request, :event
  end
end
