# frozen_string_literal: true

module Onboarding
  class EventEmitter
    class << self
      def school_provisioned(school:)
        log_event("SchoolProvisioned", school_id: school.id, onboarding_mode: school.onboarding_mode)
        Onboarding::SchoolProvisionedJob.perform_later(school.id)
      end

      def school_handed_off(school:, previous_status:)
        log_event("SchoolHandedOff", school_id: school.id, previous_status: previous_status)
        Onboarding::SchoolHandedOffJob.perform_later(school.id, previous_status)
      end

      def owner_activated(school:, user:)
        log_event("OwnerActivated", school_id: school.id, user_id: user.id)
        Onboarding::OwnerActivatedJob.perform_later(school.id, user.id)
      end

      private

      def log_event(name, payload)
        Rails.logger.info({ event: name, **payload }.to_json)
      end
    end
  end
end
