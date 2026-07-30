# frozen_string_literal: true

module Documents
  class RejectDocumentService < ApplicationService
    def initialize(document:, rejection_reason:)
      @document = document
      @rejection_reason = rejection_reason
    end

    def call
      if rejection_reason.blank?
        return ResponseService.failure(
          code: :validation_error,
          details: { rejection_reason: ["can't be blank"] }
        )
      end

      return ResponseService.failure(code: :invalid_state_transition) unless document.may_reject?

      document.rejection_reason = rejection_reason
      document.reviewed_at = Time.current
      document.reject!

      ResponseService.success(data: document)
    end

    private

    attr_reader :document, :rejection_reason
  end
end
