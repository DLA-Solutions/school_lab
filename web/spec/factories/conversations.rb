# frozen_string_literal: true

FactoryBot.define do
  factory :conversation do
    school
    student { association :student, school: school }
    audience { "coordination" }
    last_message_at { nil }

    trait :secretary do
      audience { "secretary" }
    end

    trait :with_teacher do
      audience { "teacher" }
      teacher { association :teacher, school: school }
    end
  end
end
