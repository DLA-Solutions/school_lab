# frozen_string_literal: true

module People
  class AcceptMembershipService < ApplicationService
    def initialize(membership:, user:)
      @membership = membership
      @user = user
    end

    def call
      return ResponseService.failure(code: :forbidden) unless membership.user_id == user.id
      return ResponseService.failure(code: :invalid_state_transition) unless membership.invited?

      ActiveRecord::Base.transaction do
        membership.update!(status: "active")
        link_guardian_profile if membership.role == "guardian"
      end

      ResponseService.success(data: membership)
    end

    private

    attr_reader :membership, :user

    def link_guardian_profile
      guardian = membership.school.guardians.kept
                           .where(user_id: nil)
                           .find_by("LOWER(email) = ?", user.email.downcase)

      guardian&.update!(user: user)
    end
  end
end
