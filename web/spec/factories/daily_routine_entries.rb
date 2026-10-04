# frozen_string_literal: true

FactoryBot.define do
  factory :daily_routine_entry do
    school
    student { association :student, school: school }
    date { Date.current }
    poop_count { 0 }
    pee_count { 0 }
    status { "draft" }

    trait :sent do
      status { "sent" }
      sent_at { Time.current }
      sent_by_membership { association :membership, :staff, school: school }
    end
  end
end
