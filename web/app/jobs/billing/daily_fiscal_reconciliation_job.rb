# frozen_string_literal: true

module Billing
  class DailyFiscalReconciliationJob < ApplicationJob
    queue_as :billing

    def perform
      School.kept.find_each do |school|
        Billing::DailyFiscalReconciliationService.call(school: school)
      end
    end
  end
end
