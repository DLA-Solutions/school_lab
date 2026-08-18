# frozen_string_literal: true

module Platform
  class UpdateHelpTaxonomyCategoryService < ApplicationService
    def initialize(category:, params:)
      @category = category
      @params = params.to_h.symbolize_keys
    end

    def call
      category.update!(permitted_params)
      ResponseService.success(data: category)
    rescue ActiveRecord::RecordInvalid => e
      ResponseService.failure(code: :validation_error, details: e.record.errors.to_hash)
    end

    private

    attr_reader :category, :params

    def permitted_params
      params.slice(:name, :slug, :module_key, :persona_tags, :position)
    end
  end
end
