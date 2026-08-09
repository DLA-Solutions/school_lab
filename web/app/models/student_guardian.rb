# frozen_string_literal: true

class StudentGuardian < ApplicationRecord
  include Discard::Model
  include SchoolAuditable

  belongs_to :guardian
  belongs_to :student
  belongs_to :school

  # Which parent this link is. "other" covers a grandparent, a legal guardian, anyone who is
  # neither — and unlike the two parent roles it may repeat for the same student.
  RELATIONSHIPS = %w[father mother other].freeze

  validates :guardian_id, uniqueness: { scope: :student_id, conditions: -> { kept } }
  validates :relationship, inclusion: { in: RELATIONSHIPS }
  validates :relationship,
            uniqueness: { scope: :student_id, conditions: -> { kept } },
            if: -> { kept? && relationship.in?(%w[father mother]) }
  validates :financial_percentage,
            numericality: { greater_than_or_equal_to: 0, less_than_or_equal_to: 100 },
            allow_nil: true
end
