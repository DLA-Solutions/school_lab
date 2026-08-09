# frozen_string_literal: true

class ChargeBlueprint < Blueprinter::Base
  identifier :id

  fields :billing_period, :original_amount_cents, :discount_amount_cents, :late_fee_amount_cents,
         :total_amount_cents, :due_date, :status, :kind, :description, :boleto_url

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

  view :guardian do
    excludes :original_amount_cents, :discount_amount_cents, :guardian

    field :interest_rate_percent do |charge|
      Billing::SchoolSettings.for(charge.school).interest_rate_percent&.to_f
    end

    field :payment_methods do |charge|
      {
        boleto_url: charge.boleto_url,
        pix_copy_paste: charge.pix_copy_paste
      }
    end
  end

  view :guardian_history do
    include_view :guardian
    excludes :payment_methods, :due_date

    field :paid_at

    field :source do |_charge|
      "platform"
    end
  end
end
