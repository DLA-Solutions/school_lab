# frozen_string_literal: true

FactoryBot.define do
  factory :daily_routine do
    school
    school_class { association :school_class, school: school, grade_level: "infantil_1" }
    student { association :student, school: school, school_class: school_class }
    author { association :teacher, school: school }
    date { Date.current }
    status { "draft" }
    narrative { "Manhã tranquila na rodinha." }

    trait :sent do
      status { "sent" }
      sent_at { Time.current }
    end
  end
end
