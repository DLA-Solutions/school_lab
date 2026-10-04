# frozen_string_literal: true

FactoryBot.define do
  factory :school_instructional_day do
    school_year
    school { school_year.school }
    date { school_year.starts_on + 2.months }
    instructional { true }
  end
end
