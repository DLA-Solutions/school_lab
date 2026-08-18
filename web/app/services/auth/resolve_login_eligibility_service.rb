# frozen_string_literal: true

module Auth
  class ResolveLoginEligibilityService < ApplicationService
    STAFF_ROLES = %w[staff teacher school backoffice].freeze

    def initialize(user:)
      @user = user
    end

    def call
      return ResponseService.failure(code: :user_disabled) unless user.active_for_authentication?
      return ResponseService.success(data: { user: user }) if staff_eligible? || guardian_eligible?

      ResponseService.failure(code: :access_denied)
    end

    private

    attr_reader :user

    def staff_eligible?
      user.memberships.kept.any? do |membership|
        membership.role.in?(STAFF_ROLES) && (membership.active? || membership.invited?)
      end
    end

    def guardian_eligible?
      user.guardians.kept.any? do |guardian|
        enrolled_child?(guardian) &&
          user.memberships.kept.any? do |membership|
            membership.role == "guardian" &&
              membership.school_id == guardian.school_id &&
              (membership.active? || membership.invited?)
          end
      end
    end

    def enrolled_child?(guardian)
      guardian.student_guardians.kept.includes(:student).filter_map(&:student).any?(&:enrolled?)
    end
  end
end
