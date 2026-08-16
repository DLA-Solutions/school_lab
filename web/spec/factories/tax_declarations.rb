# frozen_string_literal: true

FactoryBot.define do
  factory :tax_declaration do
    school
    guardian { association :guardian, school: school }
    calendar_year { 2025 }

    trait :with_active_version do
      after(:create) do |declaration|
        version = create(:tax_declaration_version, school: declaration.school, tax_declaration: declaration)
        declaration.update!(active_version: version)
      end
    end
  end
end
