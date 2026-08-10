# frozen_string_literal: true

module Onboarding
  class OwnerActivatedJob < ApplicationJob
    queue_as :default

    def perform(school_id, user_id)
      school = School.find_by(id: school_id)
      return unless school

      Rails.logger.info(
        "[Onboarding::OwnerActivatedJob] school=#{school.id} user=#{user_id}"
      )
    end
  end
end
