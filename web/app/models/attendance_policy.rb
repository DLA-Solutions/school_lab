# frozen_string_literal: true

class AttendancePolicy < ApplicationRecord
  include SchoolAuditable

  COUNTING_MODES = %w[lesson period_total].freeze

  belongs_to :school

  validates :counting_mode, inclusion: { in: COUNTING_MODES }
  validates :late_counts_as_absence, inclusion: { in: [ true, false ] }
  validates :auto_confirm_absence_after_minutes,
            numericality: { only_integer: true, greater_than: 0 }
end
