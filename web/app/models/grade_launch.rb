# frozen_string_literal: true

class GradeLaunch < ApplicationRecord
  include SchoolAuditable

  STATUSES = %w[launched invalidated].freeze

  belongs_to :school
  belongs_to :school_class
  belongs_to :class_discipline
  belongs_to :academic_period
  belongs_to :launched_by_membership, class_name: "Membership"
  belongs_to :supersedes, class_name: "GradeLaunch", optional: true

  validates :status, inclusion: { in: STATUSES }
  validates :launched_at, :input_digest, presence: true
  validates :invalidation_reason, presence: true, if: :invalidated?
  validate :period_accepts_launch, on: :create

  scope :current, -> { where(status: "launched") }

  before_validation :sync_school_from_class

  def invalidated?
    status == "invalidated"
  end

  def launched?
    status == "launched"
  end

  private

  def sync_school_from_class
    self.school = school_class.school if school_class.present?
  end

  def period_accepts_launch
    return if academic_period.blank?
    return unless academic_period.closure_status == "closed"

    errors.add(:academic_period, :closed)
  end
end
