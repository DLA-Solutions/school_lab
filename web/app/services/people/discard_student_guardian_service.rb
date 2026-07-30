# frozen_string_literal: true

module People
  class DiscardStudentGuardianService < ApplicationService
    def initialize(link:)
      @link = link
    end

    def call
      return ResponseService.failure(code: :invalid_state_transition) if link.discarded?

      link.discard
      ResponseService.success
    end

    private

    attr_reader :link
  end
end
