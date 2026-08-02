# frozen_string_literal: true

module Billing
  class MonitorBillingHealthService < ApplicationService
    CERTIFICATE_THRESHOLDS = [ 30, 7, 1, 0 ].freeze
    THRESHOLD_RANGES = {
      30 => 8..30,
      7 => 2..7,
      1 => 1..1,
      0 => ..0
    }.freeze

    def initialize(school: nil, as_of: Time.current)
      @school = school
      @as_of = as_of
    end

    def call
      schools_scope.find_each do |current_school|
        evaluate_school!(current_school)
      rescue StandardError => e
        BillingAlertEmitter.evaluation_failure(school_id: current_school.id, error: e.message)
      end

      ResponseService.success(data: :completed)
    end

    private

    attr_reader :school, :as_of

    def schools_scope
      return School.kept.where(id: school.id) if school

      School.kept.joins(:school_payment_providers).merge(SchoolPaymentProvider.active).distinct
    end

    def evaluate_school!(current_school)
      SchoolPaymentProvider.active.where(school_id: current_school.id).find_each do |config|
        evaluate_certificate!(config)
      end

      alert_failed_issuances!(current_school)
      alert_unissued_charges!(current_school)
    end

    def evaluate_certificate!(config)
      return unless config.certificate_expires_at

      days_remaining = ((config.certificate_expires_at - as_of) / 1.day).floor
      threshold = CERTIFICATE_THRESHOLDS.find do |candidate|
        THRESHOLD_RANGES.fetch(candidate).cover?(days_remaining) &&
          !threshold_already_alerted?(config, candidate)
      end
      return unless threshold

      BillingAlertEmitter.certificate_expiry(
        config: config,
        days_remaining: days_remaining,
        threshold: threshold,
        outage: days_remaining.negative?
      )
      mark_threshold_alerted!(config, threshold)
    end

    def alert_failed_issuances!(current_school)
      ChargeIssuance.where(school_id: current_school.id, status: "failed").find_each do |issuance|
        next if issuance_already_alerted?(current_school, issuance.id)

        BillingAlertEmitter.issuance_failure(issuance: issuance)
        mark_issuance_alerted!(current_school, issuance.id)
      end
    end

    def alert_unissued_charges!(current_school)
      unissued = UnissuedCharges.for(current_school, due_within: 3.days)
      return if unissued.fetch(:never_attempted).empty? && unissued.fetch(:permanently_failed).empty?

      BillingAlertEmitter.unissued_charges(
        school: current_school,
        never_attempted: unissued.fetch(:never_attempted),
        permanently_failed: unissued.fetch(:permanently_failed)
      )
    end

    def threshold_already_alerted?(config, threshold)
      Array(config.settings["certificate_alert_thresholds_sent"]).include?(threshold)
    end

    def mark_threshold_alerted!(config, threshold)
      sent = Array(config.settings["certificate_alert_thresholds_sent"])
      return if sent.include?(threshold)

      config.update!(settings: config.settings.merge("certificate_alert_thresholds_sent" => sent + [ threshold ]))
    end

    def issuance_already_alerted?(school, issuance_id)
      Array(monitoring_settings_for(school)["failed_issuance_alerts_sent"]).include?(issuance_id)
    end

    def mark_issuance_alerted!(school, issuance_id)
      settings = monitoring_settings_for(school)
      sent = Array(settings["failed_issuance_alerts_sent"])
      return if sent.include?(issuance_id)

      persist_monitoring_settings!(
        school,
        settings.merge("failed_issuance_alerts_sent" => sent + [ issuance_id ])
      )
    end

    def monitoring_settings_for(school)
      record = SchoolBillingSettings.find_by(school_id: school.id)
      return record.notification_schedule.fetch("monitoring", {}) if record

      {}
    end

    def persist_monitoring_settings!(school, monitoring_settings)
      record = SchoolBillingSettings.find_by(school_id: school.id)
      if record.nil?
        record = SchoolBillingSettings.create!(
          school: school,
          notification_schedule: SchoolBillingSettings.default_notification_schedule.merge(
            "monitoring" => monitoring_settings
          )
        )
        return
      end

      record.update!(
        notification_schedule: record.notification_schedule.merge("monitoring" => monitoring_settings)
      )
    end
  end
end
