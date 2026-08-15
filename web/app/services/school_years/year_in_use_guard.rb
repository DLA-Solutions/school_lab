# frozen_string_literal: true

module SchoolYears
  class YearInUseGuard
    def self.call(school_year:)
      enrollments_count = referenced_count(school_year, :enrollments)
      charges_count = referenced_count(school_year, :charges)

      if enrollments_count.positive? || charges_count.positive?
        return ResponseService.failure(
          code: :year_in_use,
          details: { enrollments_count: enrollments_count, charges_count: charges_count }
        )
      end

      ResponseService.success
    end

    def self.referenced_count(school_year, association_name)
      return 0 unless school_year.class.reflect_on_association(association_name)

      school_year.public_send(association_name).kept.count
    rescue NoMethodError
      0
    end

    private_class_method :referenced_count
  end
end
