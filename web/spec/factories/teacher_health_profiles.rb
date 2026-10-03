# frozen_string_literal: true

FactoryBot.define do
  factory :teacher_health_profile do
    school
    teacher { association :teacher, school: school }
    blood_type { "O+" }
  end
end
