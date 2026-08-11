# frozen_string_literal: true

module Billing
  class DeliverCollectionReminderService < ApplicationService
    def initialize(charge:, rule:, as_of:)
      @charge = charge
      @rule = rule
      @as_of = as_of
    end

    def call
      return ResponseService.success(data: :skipped_not_configured) unless SchoolLab::EmailDelivery.configured?
      return ResponseService.success(data: :skipped_no_email) if guardian_email.blank?

      if already_delivered_today?
        return ResponseService.success(data: :already_delivered)
      end

      ActiveRecord::Base.transaction do
        CollectionReminderDelivery.create!(
          school: charge.school,
          charge: charge,
          rule_key: rule.rule_key,
          sent_on: as_of
        )

        BillingMailer.with(charge: charge, rule_key: rule.rule_key)
                     .collection_reminder
                     .deliver_later
      end

      ResponseService.success(data: :delivered)
    end

    private

    attr_reader :charge, :rule, :as_of

    def guardian_email
      charge.guardian.email
    end

    def already_delivered_today?
      CollectionReminderDelivery.exists?(
        charge_id: charge.id,
        rule_key: rule.rule_key,
        sent_on: as_of
      )
    end
  end
end
