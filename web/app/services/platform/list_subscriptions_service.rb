# frozen_string_literal: true

module Platform
  class ListSubscriptionsService < ApplicationService
    def initialize(filters: {})
      @filters = filters
    end

    def call
      scope = PlatformSubscription.kept.includes(:school, :platform_plan).order(created_at: :desc)
      scope = scope.where(status: filters[:status]) if filters[:status].present?
      scope = scope.where(school_id: filters[:school_id]) if filters[:school_id].present?

      ResponseService.success(data: scope)
    end

    private

    attr_reader :filters
  end
end
