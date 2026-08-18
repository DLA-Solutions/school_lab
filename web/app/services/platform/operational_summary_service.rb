# frozen_string_literal: true

module Platform
  # Cross-tenant operational alerts for the backoffice dashboard — aggregate counts and lists
  # without guardian or student PII (BR-BOE03, BR-BOE04).
  class OperationalSummaryService < ApplicationService
    CREDENTIAL_WINDOW_DAYS = 30

    def initialize(as_of: Time.current)
      @as_of = as_of
    end

    def call
      ResponseService.success(
        data: {
          credentials_expiring: credentials_expiring,
          schools_with_disabled_modules: schools_with_disabled_modules,
          provisioning_backlog_count: provisioning_backlog_count
        }
      )
    end

    private

    attr_reader :as_of

    def credentials_expiring
      window_end = as_of + CREDENTIAL_WINDOW_DAYS.days

      SchoolPaymentProvider.active
                         .where.not(certificate_expires_at: nil)
                         .where(certificate_expires_at: ..window_end)
                         .includes(:school)
                         .order(:certificate_expires_at)
                         .filter_map do |config|
        school = config.school
        next unless school.kept?

        days_remaining = ((config.certificate_expires_at - as_of) / 1.day).floor

        {
          school_id: school.id,
          school_name: school.name,
          certificate_expires_at: config.certificate_expires_at.iso8601,
          days_remaining: days_remaining
        }
      end
    end

    def schools_with_disabled_modules
      School.kept
            .joins(:school_modules)
            .where(school_modules: { enabled: false })
            .distinct
            .order(:name)
            .map do |school|
        disabled = school.school_modules.where(enabled: false).order(:module_key).pluck(:module_key)

        {
          school_id: school.id,
          school_name: school.name,
          disabled_modules: disabled
        }
      end
    end

    def provisioning_backlog_count
      School.kept.where(onboarding_status: "provisioning").count
    end
  end
end
