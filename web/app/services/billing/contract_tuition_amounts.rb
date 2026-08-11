# frozen_string_literal: true

module Billing
  # Tuition amounts for a contract at charge generation: plan band from base, or negotiated/base.
  module ContractTuitionAmounts
    Amounts = Data.define(:original_amount_cents, :discount_amount_cents, :total_amount_cents,
                           :plan_discount_applied)

    module_function

    def for(contract)
      plan_discount = contract.plan_discount
      base = contract.billing_plan&.base_amount_cents

      if plan_discount.present? && base.present?
        original = base
        total = plan_discount.apply_to(original)
        discount = original - total

        Amounts.new(
          original_amount_cents: original,
          discount_amount_cents: discount,
          total_amount_cents: total,
          plan_discount_applied: true
        )
      else
        original = contract.negotiated_amount_cents || base || 0

        Amounts.new(
          original_amount_cents: original,
          discount_amount_cents: 0,
          total_amount_cents: original,
          plan_discount_applied: false
        )
      end
    end
  end
end
