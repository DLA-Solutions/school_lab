# frozen_string_literal: true

module Documents
  class DiscardDocumentService < ApplicationService
    def initialize(document:, actor:)
      @document = document
      @actor = actor
    end

    def call
      return ResponseService.failure(code: :invalid_state_transition) if document.discarded?

      document.update!(discarded_by: actor)
      document.discard

      ResponseService.success
    end

    private

    attr_reader :document, :actor
  end
end
