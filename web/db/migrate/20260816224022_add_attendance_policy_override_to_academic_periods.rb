# frozen_string_literal: true

class AddAttendancePolicyOverrideToAcademicPeriods < ActiveRecord::Migration[8.1]
  def change
    add_column :academic_periods, :attendance_policy_override, :jsonb
  end
end
