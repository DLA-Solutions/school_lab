# frozen_string_literal: true

module Attendance
  # Resolves the effective late-counting policy for a period.
  class EffectivePolicy
    def self.for(school:, period:)
      override = period.attendance_policy_override.to_h
      policy = AttendancePolicy.find_by(school: school)

      {
        late_counts_as_absence: override.fetch("late_counts_as_absence", policy&.late_counts_as_absence) == true,
        counting_mode: override.fetch("counting_mode", policy&.counting_mode) || "lesson"
      }
    end
  end
end
