# frozen_string_literal: true

module Billing
  class CollectionReguaNotifier
    def self.notify_overdue(charge:)
      return true unless SchoolLab::EmailDelivery.configured?

      today = SchoolTimezone.today_for(charge.school)
      schedule = notification_schedule_for(charge.school)
      matching_rules = post_due_rules(schedule).select do |rule|
        rule.reminder_date_for(charge: charge) == today
      end

      rules_to_deliver =
        if matching_rules.any?
          matching_rules
        else
          [ NotificationScheduleRule.overdue_transition ]
        end

      rules_to_deliver.each do |rule|
        DeliverCollectionReminderService.call(charge: charge, rule: rule, as_of: today)
      end

      true
    end

    def self.notification_schedule_for(school)
      SchoolSettings.for(school).notification_schedule.presence ||
        SchoolBillingSettings.default_notification_schedule
    end

    def self.post_due_rules(schedule)
      schedule.fetch("reminders", []).filter_map do |reminder|
        rule = NotificationScheduleRule.parse(reminder)
        rule if rule&.post_due?
      end
    end
  end
end
