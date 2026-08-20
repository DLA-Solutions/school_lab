# frozen_string_literal: true

FactoryBot.define do
  factory :platform_plan do
    sequence(:key) { |n| %w[starter pro enterprise][n % 3] }
    sequence(:name) { |n| "Plan #{n}" }
    monthly_amount_cents { 29_900 }

    after(:create) do |plan|
      %w[manual asaas fake].each do |provider|
        {
          "month" => plan.monthly_amount_cents,
          "year" => plan.monthly_amount_cents * 12
        }.each do |interval, amount|
          suffix = interval == "month" ? "monthly" : "yearly"
          PlatformPlanProviderPrice.find_or_create_by!(
            platform_plan: plan,
            provider: provider,
            billing_interval: interval
          ) do |price|
            price.external_price_id = "#{plan.key}_#{suffix}"
            price.amount_cents = amount
            price.active = true
          end
        end
      end
    end

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
    billing_interval { "month" }
    provider { "manual" }
    collection_method { "manual" }
    current_period_end { 30.days.from_now }

    trait :trialing do
      status { "trialing" }
      trial_ends_at { 14.days.from_now }
    end

    trait :trial do
      trialing
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

  factory :platform_plan_provider_price do
    platform_plan
    provider { "manual" }
    billing_interval { "month" }
    amount_cents { 29_900 }
    active { true }
  end

  factory :platform_invoice do
    platform_subscription
    school { platform_subscription.school }
    provider { "asaas" }
    status { "open" }
    amount_cents { 29_900 }
    sequence(:external_invoice_id) { |n| "inv-#{n}-#{SecureRandom.hex(4)}" }
    hosted_invoice_url { "https://asaas.test/i/example" }
  end

  factory :platform_billing_setting do
    active_provider { "manual" }
    webhook_endpoint_token { SecureRandom.hex(16) }
  end

  factory :help_taxonomy_category do
    sequence(:name) { |n| "Category #{n}" }
    sequence(:slug) { |n| "category-#{n}" }
    persona_tags { [ "secretary" ] }
    position { 0 }
    module_key { "billing" }
  end
end
