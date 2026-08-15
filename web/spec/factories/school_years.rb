# frozen_string_literal: true

FactoryBot.define do
  factory :school_year do
    school
    sequence(:name) { |n| (2025 + n).to_s }
    starts_on { Date.new(2026, 2, 1) }
    ends_on { Date.new(2026, 12, 15) }
    period_template { "trimester" }

    trait :custom do
      period_template { "custom" }
    end

    trait :active do
      after(:create) do |school_year|
        unless school_year.academic_periods.kept.exists?
          create(:academic_period, school_year: school_year, sequence: 1)
        end
        school_year.activate! if school_year.may_activate?
      end
    end

    trait :archived do
      active
      after(:create) do |school_year|
        school_year.archive! if school_year.may_archive?
      end
    end
  end
end
