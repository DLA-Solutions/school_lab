# frozen_string_literal: true

class AttendanceRecord < ApplicationRecord
  include Discard::Model
  include SchoolAuditable

  STATUSES = %w[present absent late excused].freeze

  belongs_to :attendance_session
  belongs_to :school
  belongs_to :student

  validates :status, inclusion: { in: STATUSES }
  validates :student_id,
            uniqueness: { scope: :attendance_session_id, conditions: -> { kept } },
            if: :kept?

  before_validation :sync_school_from_session

  private

  def sync_school_from_session
    self.school = attendance_session.school if attendance_session.present?
  end
end
