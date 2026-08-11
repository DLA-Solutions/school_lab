# frozen_string_literal: true

module Billing
  class ProcessCollectionRemindersJob < ApplicationJob
    queue_as :billing

    def perform(school_id: nil)
      school = school_id ? School.kept.find(school_id) : nil
      Billing::ProcessCollectionRemindersService.call(school: school)
    end
  end
end
