# frozen_string_literal: true

module Platform
  class EndImpersonationService < ApplicationService
    def initialize(session:, operator:)
      @session = session
      @operator = operator
    end

    def call
      return ResponseService.failure(code: :not_found) unless session
      return ResponseService.failure(code: :invalid_state_transition) unless session.active?

      unless session.operator_user_id == operator.id || operator.platform_permission?(:manage_backoffice_ops)
        return ResponseService.failure(code: :forbidden)
      end

      session.end!
      ResponseService.success(data: session)
    end

    private

    attr_reader :session, :operator
  end
end
