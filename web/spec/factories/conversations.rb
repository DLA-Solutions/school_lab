# frozen_string_literal: true

FactoryBot.define do
  factory :conversation do
    school
    student { association :student, school: school }
  end
end
