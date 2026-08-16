# frozen_string_literal: true

class SchoolYearBlueprint < Blueprinter::Base
  identifier :id

  fields :school_id, :name, :starts_on, :ends_on, :period_template, :status

  field :timezone do |school_year|
    school_year.timezone
  end

  view :with_periods do
    association :academic_periods, blueprint: AcademicPeriodBlueprint do |school_year, _options|
      school_year.academic_periods.kept.order(:sequence)
    end
  end

  view :with_holidays do
    association :school_holidays, blueprint: SchoolHolidayBlueprint do |school_year, _options|
      school_year.school_holidays.kept.order(:date)
    end
  end

  view :active do
    include_view :with_periods
    include_view :with_holidays
  end
end
