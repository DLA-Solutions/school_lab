# frozen_string_literal: true

FactoryBot.define do
  factory :billing_purpose do
    school
    sequence(:code) { |n| BillingPurpose::CODES[n % BillingPurpose::CODES.size] }
    name { "Purpose #{code}" }
    tax_declaration_eligible { false }

    trait :tuition do
      code { "tuition" }
      name { "Mensalidade" }
    end

    trait :enrollment do
      code { "enrollment" }
      name { "Matrícula" }
    end

    trait :eligible do
      tax_declaration_eligible { true }
    end
  end
end
