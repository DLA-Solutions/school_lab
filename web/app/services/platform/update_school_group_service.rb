# frozen_string_literal: true

module Platform
  class UpdateSchoolGroupService < ApplicationService
    def initialize(group:, params:)
      @group = group
      @params = params.to_h.symbolize_keys
    end

    def call
      group.update!(permitted_params)
      ResponseService.success(data: group)
    rescue ActiveRecord::RecordInvalid => e
      ResponseService.failure(code: :validation_error, details: e.record.errors.to_hash)
    end

    private

    attr_reader :group, :params

    def permitted_params
      params.slice(:name, :headquarters_cnpj)
    end
  end
end
