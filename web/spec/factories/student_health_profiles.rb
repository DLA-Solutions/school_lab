# frozen_string_literal: true

FactoryBot.define do
  factory :student_health_profile do
    school
    student { association :student, school: school }
    blood_type { "O+" }
  end
end
