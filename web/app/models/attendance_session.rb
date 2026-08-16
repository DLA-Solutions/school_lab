# frozen_string_literal: true

class AttendanceSession < ApplicationRecord
  include Discard::Model
  include SchoolAuditable

  belongs_to :school
  belongs_to :school_class
  belongs_to :school_year
  belongs_to :academic_period, optional: true
  belongs_to :recorded_by_membership, class_name: "Membership", optional: true

  has_many :attendance_records, dependent: :destroy

  validates :session_date, presence: true

  scope :confirmed, -> { where.not(confirmed_at: nil) }
  scope :pending_confirmation, -> { where(confirmed_at: nil) }
  scope :within_period, lambda { |period|
    where(session_date: period.starts_on..period.ends_on)
  }

  before_validation :sync_school_from_class

  def confirmed?
    confirmed_at.present?
  end

  private

  def sync_school_from_class
    self.school = school_class.school if school_class.present?
  end
end
