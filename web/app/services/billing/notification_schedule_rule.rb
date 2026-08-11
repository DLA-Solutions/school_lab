# frozen_string_literal: true

module Billing
  class NotificationScheduleRule
    OVERDUE_TRANSITION_KEY = "overdue_transition"

    attr_reader :kind, :offset_days

    def self.overdue_transition
      new(kind: :overdue_transition, offset_days: 0)
    end

    def self.parse(reminder)
      reminder = reminder.stringify_keys

      if reminder.key?("days_before_due")
        new(kind: :days_before_due, offset_days: reminder["days_before_due"].to_i)
      elsif reminder.key?("days_after_due")
        new(kind: :days_after_due, offset_days: reminder["days_after_due"].to_i)
      end
    end

    def initialize(kind:, offset_days:)
      @kind = kind
      @offset_days = offset_days
    end

    def rule_key
      case kind
      when :overdue_transition
        OVERDUE_TRANSITION_KEY
      when :days_before_due
        "days_before_due:#{offset_days}"
      when :days_after_due
        "days_after_due:#{offset_days}"
      end
    end

    def reminder_date_for(charge:)
      due_date = charge.due_date
      return nil unless due_date

      case kind
      when :days_before_due
        due_date - offset_days.days
      when :days_after_due
        due_date + offset_days.days
      when :overdue_transition
        nil
      end
    end

    def post_due?
      kind == :days_after_due || kind == :overdue_transition
    end
  end
end
