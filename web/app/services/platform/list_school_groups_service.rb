# frozen_string_literal: true

module Platform
  class ListSchoolGroupsService < ApplicationService
    def call
      ResponseService.success(data: SchoolGroup.kept.order(:name))
    end
  end
end
