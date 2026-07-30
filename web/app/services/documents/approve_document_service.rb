# frozen_string_literal: true

module Documents
  class ApproveDocumentService < ApplicationService
    def initialize(document:)
      @document = document
    end

    def call
      return ResponseService.failure(code: :invalid_state_transition) unless document.may_approve?

      document.reviewed_at = Time.current
      document.approve!

      ResponseService.success(data: document)
    end

    private

    attr_reader :document
  end
end
