# frozen_string_literal: true

module Billing
  class MarkOverdueChargesJob < ApplicationJob
    queue_as :default

    def perform(school_id: nil)
      school = school_id ? School.kept.find(school_id) : nil
      Billing::MarkOverdueChargesService.call(school: school)
    end
  end
end
