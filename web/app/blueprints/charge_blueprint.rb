# frozen_string_literal: true

class ChargeBlueprint < Blueprinter::Base
  identifier :id

  fields :billing_period, :original_amount_cents, :discount_amount_cents, :late_fee_amount_cents,
         :total_amount_cents, :due_date, :status, :kind, :description, :boleto_url,
         :billing_purpose_id, :billing_purpose_code, :tax_declaration_eligible

  # Null on a one-off raised outside any contract — the school bills for things no student is
  # enrolled in, and the listing says so rather than inventing a name.
  field :student do |charge|
    student = charge.contract&.student
    { id: student.id, name: student.name } if student
  end

  field :contract_id

  # The boleto is registered against this person's CPF, so the listing names both.
  field :guardian do |charge|
    { id: charge.guardian.id, name: charge.guardian.name, cpf: charge.guardian.cpf }
  end

  association :applied_discounts, blueprint: AppliedDiscountBlueprint

  view :guardian do
    excludes :original_amount_cents, :discount_amount_cents, :guardian, :applied_discounts

    # Settled instant; nil until the charge is paid. Same column the history view exposes.
    field :paid_at

    # A listing renders one school's charges, so it passes the rate once (`interest_rate_percent:`
    # render option) instead of re-reading the school settings for every row.
    field :interest_rate_percent do |charge, options|
      if options.key?(:interest_rate_percent)
        options[:interest_rate_percent]
      else
        Billing::SchoolSettings.for(charge.school).interest_rate_percent&.to_f
      end
    end

    # `digitable_line` and `boleto_pdf_available` come from the charge's current issuance — list
    # endpoints eager-load `:charge_issuances` so this is not one query per row. They stay
    # nil/false until the provider has produced the boleto (Banco Inter issues asynchronously).
    field :payment_methods do |charge|
      issuance = charge.current_issuance
      issued = issuance&.issued?

      {
        boleto_url: charge.boleto_url,
        pix_copy_paste: charge.pix_copy_paste,
        digitable_line: (issuance.digitable_line.presence if issued),
        boleto_pdf_available: charge.boleto_pdf_available?
      }
    end
  end

  view :guardian_history do
    include_view :guardian
    excludes :payment_methods, :due_date

    field :source do |_charge|
      "platform"
    end
  end
end
