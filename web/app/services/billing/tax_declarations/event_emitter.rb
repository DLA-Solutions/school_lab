# frozen_string_literal: true

module Billing
  module TaxDeclarations
    class EventEmitter
      class << self
        def tax_declaration_generated(version:)
          log_event(
            "TaxDeclarationGenerated",
            tax_declaration_id: version.tax_declaration_id,
            version_id: version.id
          )
        end

        def tax_declaration_superseded(version:)
          log_event(
            "TaxDeclarationSuperseded",
            tax_declaration_id: version.tax_declaration_id,
            version_id: version.id,
            supersedes_id: version.supersedes_id
          )
        end

        def tax_declaration_generation_failed(school_id:, guardian_id:, calendar_year:, code:)
          log_event(
            "TaxDeclarationGenerationFailed",
            school_id: school_id,
            guardian_id: guardian_id,
            calendar_year: calendar_year,
            code: code.to_s
          )
        end

        def tax_declaration_pdf_downloaded(access_event:)
          log_event(
            "TaxDeclarationPdfDownloaded",
            idempotency_key: access_event.request_uuid,
            tax_declaration_id: access_event.tax_declaration_id,
            version_id: access_event.tax_declaration_version_id,
            guardian_id: access_event.guardian_id,
            actor_user_id: access_event.actor_user_id,
            occurred_at: access_event.occurred_at.iso8601
          )
        end

        private

        def log_event(name, payload)
          Rails.logger.info({ event: name, **payload }.to_json)
        end
      end
    end
  end
end
