# frozen_string_literal: true

module Schools
  class CreateSchoolService < ApplicationService
    def initialize(params:)
      @params = params
    end

    def call
      school = School.new(params)
      provision_result = nil

      ActiveRecord::Base.transaction do
        unless school.save
          return ResponseService.failure(code: :validation_error, details: school.errors.to_hash)
        end

        provision_result = Identity::ProvisionSystemRoleTemplatesService.call(school: school)
        raise ActiveRecord::Rollback unless provision_result.success?
      end

      if school.persisted? && provision_result&.success?
        ResponseService.success(data: school)
      elsif provision_result&.failure?
        provision_result
      else
        ResponseService.failure(code: :validation_error, details: school.errors.to_hash)
      end
    end

    private

    attr_reader :params
  end
end
