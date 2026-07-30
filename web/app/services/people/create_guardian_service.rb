# frozen_string_literal: true

module People
  class CreateGuardianService < ApplicationService
    def initialize(school:, params:)
      @school = school
      @params = params
    end

    def call
      guardian = school.guardians.build(params)

      if guardian.save
        ResponseService.success(data: guardian)
      else
        ResponseService.failure(code: :validation_error, details: guardian.errors.to_hash)
      end
    end

    private

    attr_reader :school, :params
  end
end
