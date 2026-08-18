# frozen_string_literal: true

module Platform
  class ListHelpTaxonomyCategoriesService < ApplicationService
    def call
      ResponseService.success(data: HelpTaxonomyCategory.kept.ordered)
    end
  end
end
