# frozen_string_literal: true

FactoryBot.define do
  factory :platform_plan do
    sequence(:key) { |n| %w[starter pro enterprise][n % 3] }
    sequence(:name) { |n| "Plan #{n}" }
    monthly_amount_cents { 29_900 }

    trait :starter do
      key { "starter" }
      name { "Starter" }
      monthly_amount_cents { 29_900 }
    end

    trait :pro do
      key { "pro" }
      name { "Pro" }
      monthly_amount_cents { 59_900 }
    end

    trait :enterprise do
      key { "enterprise" }
      name { "Enterprise" }
      monthly_amount_cents { 99_900 }
    end
  end

  factory :platform_subscription do
    school
    platform_plan
    status { "active" }
    current_period_end { 30.days.from_now }

    trait :trial do
      status { "trial" }
      trial_ends_at { 14.days.from_now }
    end

    trait :past_due do
      status { "past_due" }
    end
  end

  factory :platform_impersonation_session do
    operator_user { association :user }
    target_user { association :user }
    school
    target_membership do
      association :membership, :staff, user: target_user, school: school
    end
    expires_at { 15.minutes.from_now }

    trait :ended do
      ended_at { Time.current }
    end

    trait :expired do
      expires_at { 1.minute.ago }
    end
  end

  factory :help_taxonomy_category do
    sequence(:name) { |n| "Category #{n}" }
    sequence(:slug) { |n| "category-#{n}" }
    persona_tags { [ "secretary" ] }
    position { 0 }
    module_key { "billing" }
  end
end
