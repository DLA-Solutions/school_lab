# frozen_string_literal: true

FactoryBot.define do
  factory :message do
    conversation
    school { conversation.school }
    sender_membership { association :membership, school: school, role: "teacher" }
    body { "Segue a foto da rodinha." }
    kind { "text" }
    sent_at { Time.current }

    trait :routine do
      kind { "routine" }
      body { nil }
      daily_routine do
        association :daily_routine,
                    school: school,
                    student: conversation.student,
                    school_class: conversation.student.school_class
      end
    end
  end
end
