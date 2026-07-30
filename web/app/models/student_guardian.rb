# frozen_string_literal: true

class StudentGuardian < ApplicationRecord
  include Discard::Model
  include SchoolAuditable

  belongs_to :guardian
  belongs_to :student
  belongs_to :school

  validates :guardian_id, uniqueness: { scope: :student_id, conditions: -> { kept } }
  validates :financial_percentage,
            numericality: { greater_than_or_equal_to: 0, less_than_or_equal_to: 100 },
            allow_nil: true
end
