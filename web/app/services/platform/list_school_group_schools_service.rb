# frozen_string_literal: true

module Platform
  class ListSchoolGroupSchoolsService < ApplicationService
    def initialize(group:)
      @group = group
    end

    def call
      schools = group.schools.kept.order(:name)
      ResponseService.success(data: schools)
    end

    private

    attr_reader :group
  end
end
