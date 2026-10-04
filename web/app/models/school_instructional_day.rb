# frozen_string_literal: true

# Whether one calendar date is instructional for a school year (BR-SY10). Unlike `SchoolHoliday`
# (an exclusion list), there is no weekday-pattern inference here: a date with no row is simply
# undecided, and the academic BC's lesson-plan calendar treats undecided the same as
# non-instructional — never guesses. Deliberately not `Discard::Model`: deleting a row would
# create a second way to mean "undecided" alongside the row simply not existing, which the
# business rule never defines.
class SchoolInstructionalDay < ApplicationRecord
  include SchoolAuditable

  belongs_to :school
  belongs_to :school_year

  validates :date, presence: true
  validates :date, uniqueness: { scope: :school_year_id }
  validates :instructional, inclusion: { in: [ true, false ] }
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
