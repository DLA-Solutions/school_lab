# frozen_string_literal: true

module Platform
  class CreateSchoolGroupService < ApplicationService
    def initialize(params:)
      @params = params.to_h.symbolize_keys
    end

    def call
      group = SchoolGroup.new(permitted_params)
      group.save!
      ResponseService.success(data: group)
    rescue ActiveRecord::RecordInvalid => e
      ResponseService.failure(code: :validation_error, details: e.record.errors.to_hash)
    end

    private

    attr_reader :params

    def permitted_params
      params.slice(:name, :headquarters_cnpj)
    end
  end
end
