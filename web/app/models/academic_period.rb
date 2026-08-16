# frozen_string_literal: true

class AcademicPeriod < ApplicationRecord
  include Discard::Model
  include SchoolAuditable

  CLOSURE_STATUSES = %w[open closing closed].freeze

  belongs_to :school_year
  belongs_to :school

  has_many :grades, dependent: :destroy
  has_many :evaluation_templates, dependent: :destroy
  has_many :grade_entries, dependent: :destroy
  has_many :grade_overrides, dependent: :destroy
  has_many :grade_launches, dependent: :destroy
  has_many :attendance_sessions, dependent: :destroy

  validates :name, presence: true
  validates :sequence, presence: true, numericality: { only_integer: true, greater_than: 0 }
  validates :starts_on, :ends_on, presence: true
  validates :closure_status, inclusion: { in: CLOSURE_STATUSES }
  validates :sequence, uniqueness: { scope: :school_year_id, conditions: -> { kept } }
  validate :ends_on_after_starts_on
  validate :dates_within_school_year_bounds

  before_validation :sync_school_from_year

  private

  def sync_school_from_year
    self.school = school_year.school if school_year.present?
  end

  def ends_on_after_starts_on
    return if starts_on.blank? || ends_on.blank?
    return if ends_on >= starts_on

    errors.add(:ends_on, :greater_than_or_equal_to, count: starts_on)
  end

  def dates_within_school_year_bounds
    return unless school_year && starts_on && ends_on

    return if starts_on >= school_year.starts_on && ends_on <= school_year.ends_on

    errors.add(:base, :invalid_period_range)
  end
end
