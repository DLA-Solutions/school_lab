# frozen_string_literal: true

module Onboarding
  class SchoolProvisionedJob < ApplicationJob
    queue_as :default

    def perform(school_id)
      school = School.find_by(id: school_id)
      return unless school

      Rails.logger.info(
        "[Onboarding::SchoolProvisionedJob] school=#{school.id} mode=#{school.onboarding_mode}"
      )
    end
  end
end
