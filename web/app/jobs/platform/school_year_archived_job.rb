# frozen_string_literal: true

module Platform
  class SchoolYearArchivedJob < ApplicationJob
    queue_as :default

    def perform(payload)
      Rails.logger.info("[Platform::SchoolYearArchivedJob] #{payload.to_json}")
    end
  end
end
