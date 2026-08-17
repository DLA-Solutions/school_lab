# frozen_string_literal: true

class GradeEntry < ApplicationRecord
  include Discard::Model
  include SchoolAuditable

  ENTRY_KINDS = %w[regular recovery].freeze

  belongs_to :school
  belongs_to :student
  belongs_to :class_discipline
  belongs_to :academic_period
  belongs_to :evaluation_component
  belongs_to :entered_by_membership, class_name: "Membership", optional: true

  validates :entry_kind, inclusion: { in: ENTRY_KINDS }
  validate :period_accepts_entries

  before_validation :sync_school_from_discipline

  private

  def sync_school_from_discipline
    self.school = class_discipline.school if class_discipline.present?
  end

  def period_accepts_entries
    return if academic_period.blank?
    return unless academic_period.closure_status == "closed"

    errors.add(:academic_period, :closed)
  end
end
