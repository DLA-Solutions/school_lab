# frozen_string_literal: true

class SchoolHoliday < ApplicationRecord
  include Discard::Model
  include SchoolAuditable

  def self.policy_class
    HolidayPolicy
  end

  belongs_to :school
  belongs_to :school_year

  validates :name, presence: true
  validates :date, presence: true
  validates :date, uniqueness: { scope: :school_year_id, conditions: -> { kept } }
  validate :date_within_school_year_bounds

  before_validation :sync_school_from_year

  private

  def sync_school_from_year
    self.school = school_year.school if school_year.present?
  end

  def date_within_school_year_bounds
    return unless school_year && date

    return if date >= school_year.starts_on && date <= school_year.ends_on

    errors.add(:date, :invalid)
  end
end
