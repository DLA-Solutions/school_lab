# frozen_string_literal: true

class ReportCardPublishBatch < ApplicationRecord
  include SchoolAuditable

  MODES = %w[immediate scheduled].freeze
  STATUSES = %w[scheduled processing completed failed].freeze

  belongs_to :school
  belongs_to :school_class
  belongs_to :academic_period
  belongs_to :requested_by_membership, class_name: "Membership"

  has_one :report_card_publish_schedule, dependent: :destroy
  has_many :report_card_snapshots, dependent: :nullify

  validates :mode, inclusion: { in: MODES }
  validates :status, inclusion: { in: STATUSES }

  before_validation :sync_school_from_class

  scope :in_progress, -> { where(status: %w[scheduled processing]) }

  def completed?
    status == "completed"
  end

  def failed?
    status == "failed"
  end

  private

  def sync_school_from_class
    self.school = school_class.school if school_class.present?
  end
end
