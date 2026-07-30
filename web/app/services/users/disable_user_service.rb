# frozen_string_literal: true

module Users
  class DisableUserService < ApplicationService
    def initialize(user:, actor:)
      @user = user
      @actor = actor
    end

    def call
      return ResponseService.failure(code: :invalid_state_transition) if user.disabled?

      ActiveRecord::Base.transaction do
        user.update!(
          status: "disabled",
          disabled_at: Time.current,
          disabled_by: actor
        )
        Auth::RevokeTokensService.call(user: user)
      end

      ResponseService.success(data: user)
    end

    private

    attr_reader :user, :actor
  end
end
