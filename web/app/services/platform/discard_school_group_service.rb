# frozen_string_literal: true

module Platform
  class DiscardSchoolGroupService < ApplicationService
    def initialize(group:)
      @group = group
    end

    def call
      return ResponseService.failure(code: :invalid_state_transition) if group.discarded?

      if group.schools.kept.exists?
        return ResponseService.failure(
          code: :group_has_schools,
          details: { schools_count: group.schools.kept.count }
        )
      end

      group.discard
      ResponseService.success(data: group)
    end

    private

    attr_reader :group
  end
end
