# frozen_string_literal: true

FactoryBot.define do
  factory :guardian_request do
    school
    guardian { association :guardian, school: school }
    student { association :student, school: school }
    kind { "declaration" }
    details { "Preciso de declaração de matrícula para o meu empregador." }

    # The model refuses a request about a child the guardian has nothing to do with, so the link
    # is part of building a valid one rather than something each spec remembers to add.
    after(:build) do |request|
      next if request.guardian.blank? || request.student.blank?
      next unless request.guardian.persisted? && request.student.persisted?
      next if request.guardian.students.kept.exists?(id: request.student_id)

      create(:student_guardian,
             school: request.school,
             student: request.student,
             guardian: request.guardian)
    end

    trait :second_call do
      kind { "second_call" }
      details { "Faltou à prova por consulta médica." }
      subject { association :subject, school: school }
      reference_date { Date.new(2026, 5, 12) }
    end

    # Moved through the events rather than by writing the column: the state machine refuses
    # direct assignment, and a fixture that reached a state no transition leads to would be
    # testing a request the application cannot produce.
    trait :in_progress do
      after(:create, &:start!)
    end

    trait :fulfilled do
      after(:create) do |request|
        request.resolved_at = Time.current
        request.fulfill!
      end
    end
  end
end
