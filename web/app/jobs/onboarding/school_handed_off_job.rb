# frozen_string_literal: true

module Onboarding
  class SchoolHandedOffJob < ApplicationJob
    queue_as :default

    def perform(school_id, previous_status)
      school = School.find_by(id: school_id)
      return unless school

      Rails.logger.info(
        "[Onboarding::SchoolHandedOffJob] school=#{school.id} previous_status=#{previous_status}"
      )
    end
  end
end
