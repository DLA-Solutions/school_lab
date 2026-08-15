# frozen_string_literal: true

class SchoolBillingSettings < ApplicationRecord
  include SchoolAuditable

  MAX_OVERDUE_GRACE_DAYS = 30
  MAX_SERVICE_DESCRIPTION_LENGTH = 100
  MAX_PERCENT = 100
  FINE_TYPES = %w[percent fixed].freeze

  belongs_to :school

  validates :overdue_grace_days,
            presence: true,
            numericality: { only_integer: true, greater_than_or_equal_to: 0, less_than_or_equal_to: MAX_OVERDUE_GRACE_DAYS }
  validates :service_description, length: { maximum: MAX_SERVICE_DESCRIPTION_LENGTH }, allow_nil: true
  validates :interest_rate_percent,
            numericality: {
              greater_than: 0,
              less_than_or_equal_to: MAX_PERCENT,
              allow_nil: true
            }
  validates :early_payment_discount_percent,
            numericality: {
              greater_than: 0,
              less_than_or_equal_to: MAX_PERCENT,
              allow_nil: true
            }
  # The day a family has to pay by to earn the punctuality discount. Not the due date: a contract
  # can fall due on the 10th and still reward payment made by the 5th.
  validates :early_payment_discount_day,
            numericality: {
              only_integer: true,
              greater_than_or_equal_to: 1,
              less_than_or_equal_to: 28
            },
            allow_nil: true
  validate :early_payment_discount_is_complete

  validates :fine_type, inclusion: { in: FINE_TYPES }, allow_nil: true
  validates :fine_rate_percent,
            numericality: {
              greater_than: 0,
              less_than_or_equal_to: MAX_PERCENT,
              allow_nil: true
            }
  validates :fine_amount_cents,
            numericality: { only_integer: true, greater_than: 0, allow_nil: true }
  validates :school_id, uniqueness: true
  validate :notification_schedule_shape
  validate :fine_configuration

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

  def fine_configuration
    if fine_type.blank?
      return if fine_rate_percent.blank? && fine_amount_cents.blank?

      errors.add(:fine_type, :blank)
      return
    end

    case fine_type
    when "percent"
      errors.add(:fine_rate_percent, :blank) if fine_rate_percent.blank?
      errors.add(:fine_amount_cents, :present) if fine_amount_cents.present?
    when "fixed"
      errors.add(:fine_amount_cents, :blank) if fine_amount_cents.blank?
      errors.add(:fine_rate_percent, :present) if fine_rate_percent.present?
    end
  end

  private

  # A deadline with no percentage behind it rewards nothing, and a percentage with no deadline
  # cannot be earned.
  def early_payment_discount_is_complete
    return if early_payment_discount_percent.blank? == early_payment_discount_day.blank?

    missing = early_payment_discount_day.blank? ? :early_payment_discount_day : :early_payment_discount_percent
    errors.add(missing, :blank)
  end
end
