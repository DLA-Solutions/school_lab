# frozen_string_literal: true

class GradeOverride < ApplicationRecord
  include SchoolAuditable

  belongs_to :school
  belongs_to :student
  belongs_to :class_discipline
  belongs_to :academic_period
  belongs_to :applied_by_membership, class_name: "Membership"
  belongs_to :supersedes, class_name: "GradeOverride", optional: true

  validates :computed_value, :override_value, :reason_code, presence: true
  validate :period_accepts_overrides

  scope :current, -> { where(superseded_at: nil) }

  before_validation :sync_school_from_discipline

  private

  def sync_school_from_discipline
    self.school = class_discipline.school if class_discipline.present?
  end

  def period_accepts_overrides
    return if academic_period.blank?
    return unless academic_period.closure_status == "closed"

    errors.add(:academic_period, :closed)
  end
end
