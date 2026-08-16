# frozen_string_literal: true

module SchoolYears
  class PeriodTemplateBuilder
    TEMPLATE_COUNTS = {
      "bimester" => 4,
      "trimester" => 3
    }.freeze

    TEMPLATE_LABELS = {
      "bimester" => "bimestre",
      "trimester" => "trimestre"
    }.freeze

    def self.build(school_year:, template:)
      count = TEMPLATE_COUNTS[template.to_s]
      return [] if count.nil?

      label = TEMPLATE_LABELS.fetch(template.to_s)
      total_days = (school_year.ends_on - school_year.starts_on).to_i
      chunk = total_days / count
      current_start = school_year.starts_on

      (1..count).map do |sequence|
        period_end = sequence == count ? school_year.ends_on : current_start + chunk.days
        period = {
          name: "#{sequence}º #{label}",
          sequence: sequence,
          starts_on: current_start,
          ends_on: period_end
        }
        current_start = period_end + 1.day
        period
      end
    end
  end
end
