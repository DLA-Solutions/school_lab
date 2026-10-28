# frozen_string_literal: true

module Billing
  # Per-school backfill AND incremental sync for bank-created boletos (Inter only, for now) that
  # bypassed our issuance flow entirely — the school created them directly in the bank's own
  # dashboard, so there is no ChargeIssuance row for them. One-time backfill and ongoing
  # incremental sync are the same call; only the computed `since` differs, based on the
  # `school_payment_providers.last_external_import_at` watermark.
  #
  # A payer CPF match against a kept guardian becomes a real Charge (source: migrated) via
  # Billing::CreateMigratedChargeService; an unmatched CPF is skipped (counted in the summary
  # and logged, never persisted). See docs/open-questions.md and
  # docs/modeling/001-fintech-first.md ("migrated (bank-created) boleto import").
  class ImportExternalBoletosService < ApplicationService
    LIST_INVOICES_LIMIT = 100
    # Safety lookback on incremental runs, same reasoning as DailyReconciliationService's window
    # — a run that failed partway, or a watermark advanced slightly early, should not permanently
    # lose a few days of bank activity.
    OVERLAP_DAYS = 3

    def initialize(config:, adapter: nil)
      @config = config
      @adapter = adapter
    end

    def call
      imported = 0
      unmatched = 0
      skipped = 0

      adapter.list_invoices(since: since_date, limit: LIST_INVOICES_LIMIT).each do |invoice|
        if invoice.status == "draft"
          # Not a confirmed boleto yet — see Inter::ResponseParser::STATUS_MAPPING.
          skipped += 1
          next
        end

        if already_known?(invoice)
          skipped += 1
          next
        end

        cpf = invoice.payer_cpf
        if cpf.blank?
          # The bank gave us no payer identity at all — nothing to match against.
          log_skipped_no_payer(invoice)
          skipped += 1
          next
        end

        guardian = school.guardians.kept.find_by(cpf: cpf)
        if guardian
          result = CreateMigratedChargeService.call(school: school, guardian: guardian, invoice: invoice)
          if result.success?
            imported += 1
          else
            log_import_failure(invoice, result)
          end
        else
          log_unmatched_payer(invoice)
          unmatched += 1
        end
      end

      config.update!(last_external_import_at: Time.current)

      ResponseService.success(data: {
                                school_id: school.id,
                                imported_count: imported,
                                unmatched_count: unmatched,
                                skipped_count: skipped
                              })
    end

    private

    attr_reader :config

    def school
      config.school
    end

    def adapter
      @adapter ||= Gateways::BankSlip::Registry.resolve(school: school, provider: config.provider)
    end

    def already_known?(invoice)
      ChargeIssuance.exists?(school_id: school.id, provider_invoice_id: invoice.provider_invoice_id) ||
        Charge.exists?(school_id: school.id, external_reference: invoice.provider_invoice_id)
    end

    # A dedicated watermark, distinct from DailyReconciliationService's own window: this one
    # also drives the one-time historical backfill, so it must be able to reach years back on
    # the very first run, not just the last couple of weeks.
    def since_date
      if config.last_external_import_at.present?
        (config.last_external_import_at - OVERLAP_DAYS.days).to_date
      else
        anchor_since
      end
    end

    # The one-time backfill anchor (docs/open-questions.md, "migrated (bank-created) boleto
    # import"): the earliest moment Inter credentials were ever uploaded for this school,
    # across all (active or superseded) rows — a later credential rotation must not move the
    # anchor forward and silently skip months of real bank activity. Falls back to the earliest
    # ChargeIssuance for this provider, then to the school's own creation date.
    def anchor_since
      min_uploaded_at = school.school_payment_providers
                               .where(provider: config.provider, instrument: config.instrument)
                               .minimum(:uploaded_at)
      return min_uploaded_at.to_date if min_uploaded_at

      earliest_issuance = ChargeIssuance.where(school_id: school.id, provider: config.provider).minimum(:created_at)
      return earliest_issuance.to_date if earliest_issuance

      school.created_at.to_date
    end

    def log_skipped_no_payer(invoice)
      Rails.logger.info(
        {
          event: "billing.import_external_boletos.no_payer_cpf",
          school_id: school.id,
          provider: config.provider,
          provider_invoice_id: invoice.provider_invoice_id
        }.to_json
      )
    end

    def log_unmatched_payer(invoice)
      Rails.logger.info(
        {
          event: "billing.import_external_boletos.unmatched_payer_cpf",
          school_id: school.id,
          provider: config.provider,
          provider_invoice_id: invoice.provider_invoice_id
        }.to_json
      )
    end

    def log_import_failure(invoice, result)
      Rails.logger.error(
        {
          event: "billing.import_external_boletos.charge_creation_failed",
          school_id: school.id,
          provider: config.provider,
          provider_invoice_id: invoice.provider_invoice_id,
          error_code: result.error_code,
          details: result.details
        }.to_json
      )
    end
  end
end
