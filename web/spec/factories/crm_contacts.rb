# frozen_string_literal: true

FactoryBot.define do
  factory :crm_contact do
    school
    sequence(:name) { |n| "Prospect #{n}" }
    sequence(:email) { |n| "prospect#{n}@example.com" }
    phone { "+55 11 97777-0000" }
    notes { "Asked about next year's enrollment." }
    temperature { "cold" }

    trait :warm do
      temperature { "warm" }
    end

    trait :hot do
      temperature { "hot" }
    end

    trait :discarded do
      discarded_at { Time.current }
    end
  end
end
