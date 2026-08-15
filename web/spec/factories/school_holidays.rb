# frozen_string_literal: true

FactoryBot.define do
  factory :school_holiday do
    school_year
    school { school_year.school }
    date { school_year.starts_on + 2.months }
    name { "Tiradentes" }
    applies_to_attendance { true }
  end
end
