# frozen_string_literal: true

module Platform
  class CreateHelpTaxonomyCategoryService < ApplicationService
    def initialize(params:)
      @params = params.to_h.symbolize_keys
    end

    def call
      category = HelpTaxonomyCategory.new(permitted_params)
      category.save!
      ResponseService.success(data: category)
    rescue ActiveRecord::RecordInvalid => e
      ResponseService.failure(code: :validation_error, details: e.record.errors.to_hash)
    end

    private

    attr_reader :params

    def permitted_params
      params.slice(:name, :slug, :module_key, :persona_tags, :position)
    end
  end
end
