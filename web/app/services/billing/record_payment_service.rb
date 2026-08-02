# frozen_string_literal: true

module Billing
  class RecordPaymentService < ApplicationService
    def initialize(charge:, remote_payment:)
      @charge = charge
      @remote_payment = remote_payment
    end

    def call
      existing = Payment.find_by(provider_payment_id: remote_payment.provider_payment_id)
      return ResponseService.success(data: existing) if existing

      # Guard before opening the transaction: `return` from inside a transaction block
      # commits instead of rolling back (Rails >= 6.1), which would leave a confirmed
      # payment attached to a charge that cannot be paid.
      return ResponseService.failure(code: :invalid_state_transition) unless charge.paid? || charge.may_pay?

      payment = nil
      ActiveRecord::Base.transaction do
        payment = Payment.create!(
          charge: charge,
          school: charge.school,
          paid_amount_cents: remote_payment.paid_amount_cents,
          fine_amount_cents: remote_payment.fine_amount_cents,
          interest_amount_cents: remote_payment.interest_amount_cents,
          payment_method: remote_payment.payment_method,
          provider_payment_id: remote_payment.provider_payment_id,
          paid_at: remote_payment.paid_at,
          status: "confirmed"
        )

        charge.pay! unless charge.paid?
      end

      ResponseService.success(data: payment)
    rescue ActiveRecord::RecordNotUnique
      ResponseService.success(data: Payment.find_by!(provider_payment_id: remote_payment.provider_payment_id))
    end

    private

    attr_reader :charge, :remote_payment
  end
end
