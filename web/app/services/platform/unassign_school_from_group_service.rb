# frozen_string_literal: true

module Platform
  class UnassignSchoolFromGroupService < ApplicationService
    def initialize(group:, school_id:)
      @group = group
      @school_id = school_id
    end

    def call
      school = group.schools.kept.find_by(id: school_id)
      return ResponseService.failure(code: :not_found) unless school

      school.update!(school_group: nil)
      ResponseService.success(data: school)
    rescue ActiveRecord::RecordInvalid => e
      ResponseService.failure(code: :validation_error, details: e.record.errors.to_hash)
    end

    private

    attr_reader :group, :school_id
  end
end
