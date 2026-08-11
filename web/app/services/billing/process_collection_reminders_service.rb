# frozen_string_literal: true

module Billing
  class ProcessCollectionRemindersService < ApplicationService
    def initialize(school: nil, as_of: nil)
      @school = school
      @as_of = as_of
    end

    def call
      return ResponseService.success(data: []) unless SchoolLab::EmailDelivery.configured?

      delivered = []

      reminder_scope.find_each do |charge|
        rules_for(charge).each do |rule|
          result = DeliverCollectionReminderService.call(charge: charge, rule: rule, as_of: evaluation_date_for(charge.school))
          delivered << charge if result.success? && result.data == :delivered
        end
      end

      ResponseService.success(data: delivered)
    end

    private

    attr_reader :school

    def reminder_scope
      charges = Charge.kept.where(status: %w[pending overdue])
      charges = charges.where(school_id: school.id) if school
      charges.includes(:guardian, :school)
    end

    def rules_for(charge)
      schedule = notification_schedule_for(charge.school)
      reminders = schedule.fetch("reminders", [])

      reminders.filter_map do |reminder|
        rule = NotificationScheduleRule.parse(reminder)
        next unless rule
        next unless rule.reminder_date_for(charge: charge) == evaluation_date_for(charge.school)

        rule
      end
    end

    def notification_schedule_for(charge_school)
      SchoolSettings.for(charge_school).notification_schedule.presence ||
        SchoolBillingSettings.default_notification_schedule
    end

    def evaluation_date_for(charge_school)
      @as_of || SchoolTimezone.today_for(charge_school)
    end
  end
end
