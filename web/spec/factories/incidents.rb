# frozen_string_literal: true

FactoryBot.define do
  factory :incident do
    school
    student { association :student, school: school }
    incident_type { association :incident_type, :guardian_meeting, school: school }
    reported_by_membership { association :membership, :staff, school: school }
    category { incident_type&.category || "pastoral" }
    severity { incident_type&.severity }
    visibility { "staff_only" }
    status { "pending_approval" }
    guardian_points_raised { "A família relatou dificuldade de concentração em casa." }
    school_response { "A escola vai acompanhar com a coordenação pedagógica nas próximas semanas." }

    trait :published do
      visibility { "guardian" }
      published_at { Time.current }
    end

    trait :pending_publish do
      visibility { "guardian_on_publish" }
      published_at { nil }
    end

    trait :coordination_approved do
      coordination_approved_at { Time.current }
      coordination_approved_by_membership { association :membership, :coordination, school: school }
    end

    trait :director_approved do
      director_approved_at { Time.current }
      director_approved_by_membership { association :membership, :director, school: school }
    end

    trait :approved do
      coordination_approved
      director_approved
      status { "approved" }
    end

    trait :archived do
      status { "archived" }
    end
  end
end
