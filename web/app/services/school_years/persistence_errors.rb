# frozen_string_literal: true

module SchoolYears
  module PersistenceErrors
    module_function

    def map(exception, record: nil)
      message = exception.message.to_s

      if message.include?("academic_periods_no_overlap_kept")
        return ResponseService.failure(code: :period_overlap)
      end

      if message.include?("index_school_years_one_active_per_school_kept")
        return ResponseService.failure(code: :active_year_exists)
      end

      if record&.errors&.any?
        code = record.errors.details.values.flatten.any? { |detail| detail[:error] == :invalid_period_range } ? :invalid_period_range : :validation_error
        return ResponseService.failure(code: code, details: record.errors.to_hash)
      end

      nil
    end
  end
end
