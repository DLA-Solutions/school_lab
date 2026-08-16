# frozen_string_literal: true

class ReportCardPublishSchedule < ApplicationRecord
  include SchoolAuditable

  STATUSES = %w[scheduled processing completed failed].freeze

  belongs_to :school
  belongs_to :report_card_publish_batch

  validates :scheduled_for, :school_timezone, presence: true
  validates :status, inclusion: { in: STATUSES }

  before_validation :sync_school_from_batch

  def scheduled?
    status == "scheduled"
  end

  private

  def sync_school_from_batch
    self.school = report_card_publish_batch.school if report_card_publish_batch.present?
  end
end
