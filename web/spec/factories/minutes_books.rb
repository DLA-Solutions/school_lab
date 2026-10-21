# frozen_string_literal: true

FactoryBot.define do
  factory :minutes_book do
    school
    sequence(:name) { |n| "Livro Ata #{n}" }
    year { 2026 }

    trait :discarded do
      discarded_at { Time.current }
    end
  end
end
