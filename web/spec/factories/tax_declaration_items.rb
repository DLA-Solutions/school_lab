# frozen_string_literal: true

FactoryBot.define do
  factory :tax_declaration_item do
    school
    tax_declaration_version { association :tax_declaration_version, school: school }
    student { association :student, school: school }
    payment { association :payment, school: school }
    charge { payment.charge }
    billing_purpose_code { "tuition" }
    paid_at { payment.paid_at }
    source_paid_amount_cents { payment.paid_amount_cents }
    source_fine_amount_cents { payment.fine_amount_cents }
    source_interest_amount_cents { payment.interest_amount_cents }
    declared_principal_amount_cents { payment.paid_amount_cents - payment.fine_amount_cents - payment.interest_amount_cents }
  end
end
