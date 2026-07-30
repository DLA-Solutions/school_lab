# frozen_string_literal: true

module Users
  class EnableUserService < ApplicationService
    def initialize(user:)
      @user = user
    end

    def call
      return ResponseService.failure(code: :invalid_state_transition) unless user.disabled?

      user.update!(
        status: "active",
        disabled_at: nil,
        disabled_by: nil
      )

      ResponseService.success(data: user)
    end

    private

    attr_reader :user
  end
end
