# frozen_string_literal: true

FactoryBot.define do
  factory :incident_guardian do
    incident
    guardian { association :guardian, school: incident.school }
    name { guardian&.name || "Guardian" }
    relationship { "other" }
  end
end
