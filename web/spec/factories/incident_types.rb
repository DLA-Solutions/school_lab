# frozen_string_literal: true

FactoryBot.define do
  factory :incident_type do
    school
    sequence(:name) { |n| "Tipo de ocorrência #{n}" }
    category { "pastoral" }
    default_visibility { "staff_only" }
    is_system { false }

    trait :guardian_meeting do
      name { "Reunião com os pais" }
      category { "pastoral" }
      default_visibility { "staff_only" }
      is_system { true }
      system_key { IncidentType::GUARDIAN_MEETING_SYSTEM_KEY }
    end

    trait :health do
      category { "health" }
      severity { "high" }
    end

    trait :disciplinary do
      category { "disciplinary" }
    end
  end
end
