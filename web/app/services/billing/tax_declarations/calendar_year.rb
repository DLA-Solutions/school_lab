# frozen_string_literal: true

module Billing
  module TaxDeclarations
    module CalendarYear
      module_function

      def closed?(school:, calendar_year:)
        timezone = Billing::SchoolTimezone.timezone_for(school)
        year_end = timezone.local(calendar_year, 12, 31).end_of_day
        Time.current.in_time_zone(timezone) > year_end
      end

      def bounds(school:, calendar_year:)
        timezone = Billing::SchoolTimezone.timezone_for(school)
        start_at = timezone.local(calendar_year, 1, 1).beginning_of_day
        end_at = timezone.local(calendar_year, 12, 31).end_of_day
        [ start_at, end_at ]
      end
    end
  end
end
