# frozen_string_literal: true

class GradeScale < ApplicationRecord
  include Discard::Model
  include SchoolAuditable

  SCALE_TYPES = %w[numeric concept rubric].freeze

  belongs_to :school

  has_many :evaluation_components, dependent: :destroy

  validates :name, presence: true
  validates :scale_type, inclusion: { in: SCALE_TYPES }
  validates :version, presence: true, numericality: { only_integer: true, greater_than: 0 }
  validates :name, uniqueness: { scope: %i[school_id version], conditions: -> { kept } }, if: :kept?
end
