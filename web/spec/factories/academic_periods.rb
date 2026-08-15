# frozen_string_literal: true

FactoryBot.define do
  factory :academic_period do
    school_year
    school { school_year.school }
    name { "1º trimestre" }
    starts_on { school_year.starts_on }
    ends_on { school_year.starts_on + 3.months }
    closure_status { "open" }

    after(:build) do |period, _evaluator|
      period.sequence ||= 1
    end
  end
end
