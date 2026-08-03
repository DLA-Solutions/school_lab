# frozen_string_literal: true

class SchoolBillingSettings < ApplicationRecord
  include SchoolAuditable

  MAX_OVERDUE_GRACE_DAYS = 30
  MAX_SERVICE_DESCRIPTION_LENGTH = 100
  MAX_INTEREST_RATE_PERCENT = 100

  belongs_to :school

  validates :overdue_grace_days,
            presence: true,
            numericality: { only_integer: true, greater_than_or_equal_to: 0, less_than_or_equal_to: MAX_OVERDUE_GRACE_DAYS }
  validates :service_description, length: { maximum: MAX_SERVICE_DESCRIPTION_LENGTH }, allow_nil: true
  validates :interest_rate_percent,
            numericality: {
              greater_than: 0,
              less_than_or_equal_to: MAX_INTEREST_RATE_PERCENT,
              allow_nil: true
            }
  validates :school_id, uniqueness: true
  validate :notification_schedule_shape

  def self.default_notification_schedule
    {
      "reminders" => [
        { "days_before_due" => 3 },
        { "days_after_due" => 1 },
        { "days_after_due" => 7 }
      ]
    }
  end

  private

  def notification_schedule_shape
    return if notification_schedule.blank?
    return if notification_schedule.is_a?(Hash) && notification_schedule["reminders"].is_a?(Array)

    errors.add(:notification_schedule, :invalid)
  end
end
