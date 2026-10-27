# frozen_string_literal: true

module Billing
  # Scoping the two billing-eligibility screens (bulk emission, avulso student picker) to a
  # school year: `school_year_id` names a `SchoolYear`, but a cohort's `school_classes.year` is
  # still a bare calendar integer (see controller-level note on the 005 modeling drift), so the
  # bridge is the calendar year the school year starts in.
  module SchoolYearScoping
    extend ActiveSupport::Concern

    private

    # nil when no `school_year_id` was given — callers then skip filtering by year. Raises
    # ActiveRecord::RecordNotFound (-> 404, already rescued globally) for a school_year_id that
    # does not belong to Current.school.
    def billing_school_year_calendar_year
      return nil if params[:school_year_id].blank?

      Current.school.school_years.kept.find(params[:school_year_id]).starts_on.year
    end

    def enrolled_students_for_billing(calendar_year)
      students = Current.school.students.enrolled
      return students if calendar_year.nil?

      students.joins(:school_class).merge(SchoolClass.kept.for_year(calendar_year))
    end
  end
end
