# frozen_string_literal: true

module Platform
  class AssignSchoolToGroupService < ApplicationService
    def initialize(group:, school_id:)
      @group = group
      @school_id = school_id
    end

    def call
      school = School.kept.find_by(id: school_id)
      return ResponseService.failure(code: :not_found) unless school

      if school.school_group_id.present? && school.school_group_id != group.id
        return ResponseService.failure(code: :school_already_in_group)
      end

      school.update!(school_group: group)
      ResponseService.success(data: school)
    rescue ActiveRecord::RecordInvalid => e
      ResponseService.failure(code: :validation_error, details: e.record.errors.to_hash)
    end

    private

    attr_reader :group, :school_id
  end
end
