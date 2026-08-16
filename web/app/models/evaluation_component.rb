# frozen_string_literal: true

class EvaluationComponent < ApplicationRecord
  include Discard::Model
  include SchoolAuditable

  ENTRY_KINDS = %w[regular recovery].freeze

  belongs_to :school
  belongs_to :evaluation_template
  belongs_to :class_discipline
  belongs_to :grade_scale

  has_many :grade_entries, dependent: :destroy

  validates :name, presence: true
  validates :weight_percent, presence: true, numericality: { greater_than: 0, less_than_or_equal_to: 100 }
  validates :entry_kind, inclusion: { in: ENTRY_KINDS }
  validates :position, presence: true, numericality: { only_integer: true, greater_than: 0 }
  validates :position,
            uniqueness: {
              scope: %i[evaluation_template_id class_discipline_id],
              conditions: -> { kept }
            },
            if: :kept?

  before_validation :sync_school_from_template

  private

  def sync_school_from_template
    self.school = evaluation_template.school if evaluation_template.present?
  end
end
