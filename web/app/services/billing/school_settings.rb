# frozen_string_literal: true

module Billing
  class SchoolSettings
    include ActiveModel::Model
    include ActiveModel::Attributes

    attribute :school_id, :integer
    attribute :overdue_grace_days, :integer
    attribute :service_description, :string
    attribute :notification_schedule, default: -> { SchoolBillingSettings.default_notification_schedule }
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
          persisted: true
        )
      end
    end

    def overdue_grace_cutoff(as_of: Date.current)
      as_of - overdue_grace_days.days
    end
  end
end
