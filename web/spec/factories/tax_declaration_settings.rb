# frozen_string_literal: true

FactoryBot.define do
  factory :tax_declaration_setting do
    school
    configuration_version { 1 }

    trait :approved do
      legal_accounting_approved_at { Time.current }
      approved_by factory: :user
      approved_purpose_configuration_digest { "abc123" }
    end
  end
end
