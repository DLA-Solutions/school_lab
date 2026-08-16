# frozen_string_literal: true

module Attendance
  # Deterministic period attendance summary for report-card snapshots (BR-AT14).
  class PeriodSummaryService < ApplicationService
    Summary = Data.define(
      :instructional_sessions,
      :present_count,
      :absent_count,
      :late_count,
      :excused_count,
      :numerator,
      :late_counts_as_absence,
      :percentage
    )

    def initialize(student:, academic_period:, school_class:)
      @student = student
      @academic_period = academic_period
      @school_class = school_class
    end

    def call
      policy = EffectivePolicy.for(school: academic_period.school, period: academic_period)
      records = eligible_records
      counts = tally(records)

      denominator = counts.values.sum
      numerator = counts["present"] + (policy[:late_counts_as_absence] ? 0 : counts["late"])
      percentage = compute_percentage(numerator, denominator)

      ResponseService.success(
        data: Summary.new(
          instructional_sessions: denominator,
          present_count: counts["present"],
          absent_count: counts["absent"],
          late_count: counts["late"],
          excused_count: counts["excused"],
          numerator: numerator,
          late_counts_as_absence: policy[:late_counts_as_absence],
          percentage: percentage
        )
      )
    end

    private

    attr_reader :student, :academic_period, :school_class

    def eligible_records
      AttendanceRecord.kept
                      .joins(:attendance_session)
                      .merge(AttendanceSession.kept.confirmed.within_period(academic_period))
                      .where(
                        student: student,
                        school_id: academic_period.school_id,
                        attendance_sessions: { school_class_id: school_class.id }
                      )
    end

    def tally(records)
      counts = AttendanceRecord::STATUSES.index_with { 0 }
      records.find_each { |record| counts[record.status] += 1 }
      counts
    end

    def compute_percentage(numerator, denominator)
      return nil if denominator.zero?

      ((numerator.to_d / denominator) * 100).round(2, BigDecimal::ROUND_HALF_UP).to_f
    end
  end
end
