# frozen_string_literal: true

FactoryBot.define do
  factory :class_discipline do
    school
    school_class { association :school_class, school: school }
    subject { association :subject, school: school }
    school_year { association :school_year, school: school }
    required_on_report_card { true }
  end

  factory :grade_scale do
    school
    sequence(:name) { |n| "Scale #{n}" }
    scale_type { "numeric" }
    version { 1 }
    configuration { { "min" => 0, "max" => 10, "decimals" => 1 } }
  end

  factory :evaluation_template do
    school
    transient do
      school_year { association :school_year, school: school }
    end
    school_class { association :school_class, school: school, year: school_year.name.to_i }
    academic_period { association :academic_period, school: school, school_year: school_year }
    version { 1 }
    rounding_mode { "half_up" }
    lock_on_launch { false }
    created_by_membership { association :membership, :staff, school: school }
  end

  factory :evaluation_component do
    school
    evaluation_template { association :evaluation_template, school: school }
    class_discipline { association :class_discipline, school: school }
    grade_scale { association :grade_scale, school: school }
    sequence(:name) { |n| "P#{n}" }
    weight_percent { 100 }
    entry_kind { "regular" }
    sequence(:position) { |n| n }
  end

  factory :grade_entry do
    school
    student { association :student, school: school }
    class_discipline { association :class_discipline, school: school }
    academic_period { association :academic_period, school: school }
    evaluation_component { association :evaluation_component, school: school }
    entry_kind { "regular" }
    value { "8.0" }
    entered_by_membership { association :membership, :staff, school: school }
  end

  factory :grade_override do
    school
    student { association :student, school: school }
    class_discipline { association :class_discipline, school: school }
    academic_period { association :academic_period, school: school }
    computed_value { "7.0" }
    override_value { "8.0" }
    reason_code { "coordination_adjustment" }
    applied_by_membership { association :membership, :staff, school: school }
  end

  factory :grade_launch do
    school
    school_class { association :school_class, school: school }
    class_discipline { association :class_discipline, school: school, school_class: school_class }
    academic_period { association :academic_period, school: school }
    launched_by_membership { association :membership, :staff, school: school }
    status { "launched" }
    launched_at { Time.current }
    sequence(:input_digest) { |n| Digest::SHA256.hexdigest("launch-#{n}") }
  end

  factory :attendance_policy do
    school
    counting_mode { "lesson" }
    late_counts_as_absence { false }
    auto_confirm_absence_after_minutes { 15 }
  end

  factory :attendance_session do
    school
    transient do
      period_school_year { association :school_year, school: school }
    end
    school_year { period_school_year }
    school_class { association :school_class, school: school, year: period_school_year.name.to_i }
    academic_period { association :academic_period, school: school, school_year: period_school_year }
    session_date { Date.current }
    confirmed_at { Time.current }
  end

  factory :attendance_record do
    attendance_session
    school { attendance_session.school }
    student { association :student, school: school, school_class: attendance_session.school_class }
    status { "present" }
  end
end
