# frozen_string_literal: true

class EvaluationTemplate < ApplicationRecord
  include Discard::Model
  include SchoolAuditable

  ROUNDING_MODES = %w[half_up].freeze

  belongs_to :school
  belongs_to :school_class
  belongs_to :academic_period
  belongs_to :supersedes, class_name: "EvaluationTemplate", optional: true
  belongs_to :created_by_membership, class_name: "Membership"

  has_many :evaluation_components, dependent: :destroy

  validates :version, presence: true, numericality: { only_integer: true, greater_than: 0 }
  validates :rounding_mode, inclusion: { in: ROUNDING_MODES }
  validates :lock_on_launch, inclusion: { in: [ true, false ] }
  validates :version,
            uniqueness: {
              scope: %i[school_id school_class_id academic_period_id],
              conditions: -> { kept }
            },
            if: :kept?

  scope :current, -> { kept.where(retired_at: nil) }

  before_validation :sync_school_from_class

  def current?
    retired_at.nil? && kept?
  end

  private

  def sync_school_from_class
    self.school = school_class.school if school_class.present?
  end
end
