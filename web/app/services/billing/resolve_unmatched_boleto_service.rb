# frozen_string_literal: true

module Billing
  # Staff picks the right guardian for a bank-created boleto that Billing::ImportExternalBoletosService
  # could not match by CPF. Builds a synthetic RemoteInvoice from the UnmatchedBoleto's
  # last-synced snapshot — the bank is not re-fetched at resolve time, staff is reviewing
  # exactly what was last imported — and defers to Billing::CreateMigratedChargeService for
  # the actual charge creation, so both paths stay idempotent and consistent.
  class ResolveUnmatchedBoletoService < ApplicationService
    def initialize(unmatched_boleto:, guardian:, actor:)
      @unmatched_boleto = unmatched_boleto
      @guardian = guardian
      @actor = actor
    end

    def call
      return ResponseService.failure(code: :invalid_state_transition) unless unmatched_boleto.pending?
      # Defense in depth: the controller should already scope the guardian lookup through
      # policy_scope(Guardian), but the service must not trust that blindly.
      return ResponseService.failure(code: :cross_tenant) if guardian.school_id != unmatched_boleto.school_id

      result = CreateMigratedChargeService.call(school: unmatched_boleto.school, guardian: guardian, invoice: invoice)
      return result if result.failure?

      ActiveRecord::Base.transaction do
        unmatched_boleto.update!(
          status: "resolved",
          resolved_at: Time.current,
          resolved_by: actor,
          resolved_guardian: guardian,
          charge: result.data
        )
      end

      ResponseService.success(data: unmatched_boleto.reload)
    end

    private

    attr_reader :unmatched_boleto, :guardian, :actor

    def invoice
      Gateways::BankSlip::ValueObjects::RemoteInvoice.new(
        provider_invoice_id: unmatched_boleto.provider_invoice_id,
        status: unmatched_boleto.provider_status,
        total_amount_cents: unmatched_boleto.amount_cents,
        due_date: unmatched_boleto.due_date,
        payments: synthetic_payments,
        payer_cpf: unmatched_boleto.payer_cpf,
        payer_name: unmatched_boleto.payer_name
      )
    end

    def synthetic_payments
      return [] unless unmatched_boleto.provider_status == "paid" && unmatched_boleto.paid_amount_cents.present?

      [
        Gateways::BankSlip::ValueObjects::RemotePayment.new(
          provider_payment_id: "unmatched-#{unmatched_boleto.id}-#{unmatched_boleto.paid_at&.to_i}",
          paid_amount_cents: unmatched_boleto.paid_amount_cents,
          paid_at: unmatched_boleto.paid_at || Time.current,
          payment_method: unmatched_boleto.payment_method || "pix"
        )
      ]
    end
  end
end
