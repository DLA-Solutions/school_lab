# frozen_string_literal: true

module Billing
  module BusinessDayCalendar
    module_function

    def effective_due_date(due_date)
      roll_forward(due_date)
    end

    def add_business_days(from_date, count)
      date = from_date
      remaining = count

      while remaining.positive?
        date += 1.day
        remaining -= 1 unless non_business_day?(date)
      end

      date
    end

    def overdue?(due_date:, grace_days:, as_of:)
      as_of > effective_due_date(due_date) + grace_days.days
    end

    def roll_forward(date)
      current = date
      current += 1.day while non_business_day?(current)
      current
    end

    def non_business_day?(date)
      date.saturday? || date.sunday? || holiday?(date)
    end

    def holiday?(date)
      fixed_holidays(date.year).include?(date) || movable_holidays(date.year).include?(date)
    end

    def fixed_holidays(year)
      [
        Date.new(year, 1, 1),
        Date.new(year, 4, 21),
        Date.new(year, 5, 1),
        Date.new(year, 9, 7),
        Date.new(year, 10, 12),
        Date.new(year, 11, 2),
        Date.new(year, 11, 15),
        Date.new(year, 11, 20), # Black Awareness Day — national since Lei 14.759/2023
        Date.new(year, 12, 25)
      ]
    end

    def movable_holidays(year)
      easter = easter_on(year)
      [
        easter - 48.days, # Carnaval Monday
        easter - 47.days, # Carnaval Tuesday
        easter - 2.days,  # Good Friday
        easter + 60.days   # Corpus Christi
      ]
    end

    def easter_on(year)
      a = year % 19
      b = year / 100
      c = year % 100
      d = b / 4
      e = b % 4
      f = (b + 8) / 25
      g = (b - f + 1) / 3
      h = (19 * a + b - d - g + 15) % 30
      i = c / 4
      k = c % 4
      l = (32 + (2 * e) + (2 * i) - h - k) % 7
      m = (a + (11 * h) + (22 * l)) / 451
      month = (h + l - (7 * m) + 114) / 31
      day = ((h + l - (7 * m) + 114) % 31) + 1

      Date.new(year, month, day)
    end
  end
end
