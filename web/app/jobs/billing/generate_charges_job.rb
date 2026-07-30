# frozen_string_literal: true

module Billing
  class GenerateChargesJob < ApplicationJob
    queue_as :default

    def perform(school_id:, billing_period:)
      school = School.kept.find(school_id)
      Billing::GenerateChargesService.call(school: school, billing_period: billing_period)
    end
  end
end
