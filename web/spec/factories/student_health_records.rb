# frozen_string_literal: true

FactoryBot.define do
  factory :student_health_record do
    school
    student { association :student, school: school }
    title { "Peanut allergy" }
    content { "Carries epinephrine auto-injector." }
    created_by { association :user }
    updated_by { created_by }
    content_updated_at { Time.current }
  end
end
