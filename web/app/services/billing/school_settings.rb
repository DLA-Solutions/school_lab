# frozen_string_literal: true

module Billing
  class SchoolSettings
    include ActiveModel::Model
    include ActiveModel::Attributes

    attribute :school_id, :integer
    attribute :overdue_grace_days, :integer
    attribute :service_description, :string
    attribute :notification_schedule, default: -> { SchoolBillingSettings.default_notification_schedule }
    attribute :interest_rate_percent, :decimal
    attribute :early_payment_discount_percent, :decimal
    attribute :early_payment_discount_day, :integer
    attribute :fine_type, :string
    attribute :fine_rate_percent, :decimal
    attribute :fine_amount_cents, :integer
    attribute :persisted, :boolean, default: false

    class << self
      def for(school)
        record = SchoolBillingSettings.find_by(school_id: school.id)
        return from_record(record) if record

        new(
          school_id: school.id,
          overdue_grace_days: default_overdue_grace_days,
          service_description: default_service_description,
          notification_schedule: SchoolBillingSettings.default_notification_schedule,
          interest_rate_percent: nil,
          early_payment_discount_percent: nil,
          early_payment_discount_day: nil,
          fine_type: nil,
          fine_rate_percent: nil,
          fine_amount_cents: nil,
          persisted: false
        )
      end

      def default_overdue_grace_days
        3
      end

      def default_service_description
        I18n.t("billing.settings.default_service_description")
      end

      def from_record(record)
        new(
          school_id: record.school_id,
          overdue_grace_days: record.overdue_grace_days,
          service_description: record.service_description.presence || default_service_description,
          notification_schedule: record.notification_schedule.presence || SchoolBillingSettings.default_notification_schedule,
          interest_rate_percent: record.interest_rate_percent,
          early_payment_discount_percent: record.early_payment_discount_percent,
          early_payment_discount_day: record.early_payment_discount_day,
          fine_type: record.fine_type,
          fine_rate_percent: record.fine_rate_percent,
          fine_amount_cents: record.fine_amount_cents,
          persisted: true
        )
      end
    end

    def overdue_grace_cutoff(as_of: Date.current)
      as_of - overdue_grace_days.days
    end

    def interest_rate_configured?
      interest_rate_percent.present?
    end

    def early_payment_discount_configured?
      early_payment_discount_percent.present?
    end

    def fine_configured?
      fine_type.present?
    end
  end
end
