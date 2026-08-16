# frozen_string_literal: true

FactoryBot.define do
  factory :preceptorship_report do
    school
    student { association :student, school: school }
    teacher { association :teacher, school: school }
    body do
      "Pedro tem participado bem das aulas e ajudado os colegas. Precisa de mais atenção na " \
        "leitura em voz alta, onde ainda se apressa."
    end

    # Published through the event rather than by writing the column: the state machine refuses
    # direct assignment, and `published_at` is what the PDF prints as the date.
    trait :published do
      after(:create) do |report|
        report.published_at = Time.current
        report.publish!
      end
    end
  end
end
