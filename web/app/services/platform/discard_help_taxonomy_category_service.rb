# frozen_string_literal: true

module Platform
  class DiscardHelpTaxonomyCategoryService < ApplicationService
    def initialize(category:)
      @category = category
    end

    def call
      return ResponseService.failure(code: :invalid_state_transition) if category.discarded?

      category.discard
      ResponseService.success(data: category)
    end

    private

    attr_reader :category
  end
end
