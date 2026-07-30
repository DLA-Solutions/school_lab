# frozen_string_literal: true

class ChargeBlueprint < Blueprinter::Base
  identifier :id

  fields :billing_period, :original_amount, :discount_amount, :total_amount, :due_date, :status

  field :student do |charge|
    student = charge.contract.student
    { id: student.id, name: student.name }
  end

  field :guardian do |charge|
    { id: charge.guardian.id, name: charge.guardian.name }
  end

  view :guardian do
    excludes :original_amount, :discount_amount, :guardian

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

    field :paid_at do |charge|
      charge.payments.order(paid_at: :desc).pick(:paid_at)
    end

    field :source do |_charge|
      "platform"
    end
  end
end
