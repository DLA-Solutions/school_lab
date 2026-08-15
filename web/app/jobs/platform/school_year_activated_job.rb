# frozen_string_literal: true

module Platform
  class SchoolYearActivatedJob < ApplicationJob
    queue_as :default

    def perform(payload)
      Rails.logger.info("[Platform::SchoolYearActivatedJob] #{payload.to_json}")
    end
  end
end
