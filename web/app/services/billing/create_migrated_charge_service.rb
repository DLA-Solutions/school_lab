# frozen_string_literal: true

module Billing
  # Creates (or finds) the Charge for a bank-created boleto that bypassed our issuance flow —
  # the school created it directly in the bank's own dashboard, so there is no ChargeIssuance
  # row for it. Called from both Billing::ImportExternalBoletosService (automatic CPF match)
  # and Billing::ResolveUnmatchedBoletoService (staff picks the guardian by hand), so a retry
  # from either caller must be a no-op rather than a duplicate.
  class CreateMigratedChargeService < ApplicationService
    def initialize(school:, guardian:, invoice:, actor: nil)
      @school = school
      @guardian = guardian
      @invoice = invoice
      @actor = actor
    end

    def call
      existing = find_existing
      return ResponseService.success(data: existing) if existing

      charge = nil
      ActiveRecord::Base.transaction do
        charge = build_charge
        charge.save!
      end

      settle_with_bank_status(charge)
    rescue ActiveRecord::RecordNotUnique
      ResponseService.success(data: find_existing)
    end

    private

    attr_reader :school, :guardian, :invoice, :actor

    def find_existing
      Charge.find_by(school_id: school.id, external_reference: invoice.provider_invoice_id)
    end

    # Deliberately leaves `billing_purpose`/`billing_purpose_code` unset and
    # `tax_declaration_eligible` at its DB default (`false`) — the bank gives us no purpose
    # classification for a boleto it issued itself, so Billing::ApplyChargeClassificationService
    # is never called here. This mirrors the DBML's own documented allowance for legacy rows
    # pending verified classification; fiscal/tax-declaration classification of migrated
    # charges is an open follow-up, not an oversight.
    def build_charge
      school.charges.build(
        guardian: guardian,
        kind: "one_off",
        source: "migrated",
        external_reference: invoice.provider_invoice_id,
        description: I18n.t("billing.migrated_charge.description"),
        billing_period: (invoice.due_date || Date.current).beginning_of_month,
        due_date: invoice.due_date,
        original_amount_cents: invoice.total_amount_cents,
        discount_amount_cents: 0,
        late_fee_amount_cents: 0,
        total_amount_cents: invoice.total_amount_cents
      )
    end

    # There is nothing to issue — the boleto already exists at the bank — so, unlike a normal
    # one-off charge, this never enqueues Billing::IssueChargeJob. It only reconciles the
    # charge's AASM status to whatever the bank already reports.
    def settle_with_bank_status(charge)
      case invoice.status
      when "open"
        ResponseService.success(data: charge)
      when "late"
        # Approximate: AASM stamps overdue_at as now, since the bank does not give us the exact
        # moment the boleto actually went overdue.
        charge.mark_overdue! if charge.may_mark_overdue?
        ResponseService.success(data: charge)
      when "cancelled"
        charge.cancel! if charge.may_cancel?
        ResponseService.success(data: charge)
      when "paid"
        reconcile_paid(charge)
      else
        ResponseService.success(data: charge)
      end
    end

    # A "paid" invoice with no payments is a real data-quality signal, not something to paper
    # over: propagate ReconcilePaidInvoiceService's failure as our own rather than leaving a
    # pending Charge dangling under a "paid" bank status.
    def reconcile_paid(charge)
      result = ReconcilePaidInvoiceService.call(charge: charge, invoice: invoice)
      return result if result.failure?

      ResponseService.success(data: charge.reload)
    end
  end
end
