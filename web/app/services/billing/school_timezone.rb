# frozen_string_literal: true

module Billing
  module SchoolTimezone
    DEFAULT = "America/Sao_Paulo"

    module_function

    def timezone_for(_school)
      ActiveSupport::TimeZone[DEFAULT]
    end

    def today_for(school)
      timezone_for(school).today
    end
  end
end
