# frozen_string_literal: true

class SchoolYear < ApplicationRecord
  include Discard::Model
  include SchoolAuditable
  include SchoolYearStateMachine

  PERIOD_TEMPLATES = %w[bimester trimester custom].freeze
  STATUSES = %w[draft active archived].freeze

  belongs_to :school

  has_many :academic_periods, dependent: :destroy
  has_many :school_holidays, dependent: :destroy

  validates :name, presence: true
  validates :starts_on, :ends_on, presence: true
  validates :period_template, inclusion: { in: PERIOD_TEMPLATES }
  validates :status, inclusion: { in: STATUSES }
  validate :ends_on_after_starts_on

  # Which calendar year the term belongs to comes from `starts_on`, not from `name`: the name is
  # free text ("2026", "Ano Letivo 2026"), so matching it against a class's `year` as a string
  # breaks for any school that writes the name differently.
  # Table-qualified because this is merged into queries that join `academic_periods`, which has a
  # `starts_on` of its own.
  scope :for_calendar_year, lambda { |year|
    where("EXTRACT(YEAR FROM school_years.starts_on) = ?", year.to_i)
  }

  scope :draft, -> { kept.where(status: "draft") }
  scope :active_status, -> { kept.where(status: "active") }
  scope :archived, -> { kept.where(status: "archived") }

  def draft?
    status == "draft"
  end

  def active?
    status == "active"
  end

  def archived?
    status == "archived"
  end

  def timezone
    school.timezone
  end

  private

  def ends_on_after_starts_on
    return if starts_on.blank? || ends_on.blank?
    return if ends_on >= starts_on

    errors.add(:ends_on, :greater_than_or_equal_to, count: starts_on)
  end
end
