# frozen_string_literal: true

# A yearly Livro Ata (BR-LA01): a named container for the minutes a school writes in a year. It has
# no workflow of its own; soft-deleting one frees its name for reuse.
class MinutesBook < ApplicationRecord
  include Discard::Model
  include SchoolAuditable

  YEAR_RANGE = (1900..2200)

  belongs_to :school
  belongs_to :created_by_membership, class_name: "Membership", optional: true

  has_many :minutes_entries, dependent: :restrict_with_error

  before_validation :normalize_name

  validates :name, presence: true
  validates :year, numericality: { only_integer: true, in: YEAR_RANGE }
  validates :name, uniqueness: { scope: %i[school_id year], conditions: -> { kept } }

  scope :for_year, ->(year) { where(year: year) }
  scope :ordered, -> { order(year: :desc, name: :asc, id: :asc) }

  private

  def normalize_name
    self.name = name.to_s.squish.presence
  end
end
