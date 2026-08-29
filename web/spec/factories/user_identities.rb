# frozen_string_literal: true

FactoryBot.define do
  factory :user_identity do
    user
    provider { "google" }
    sequence(:provider_uid) { |n| "google-sub-#{n}" }
    email { user.email }
    email_verified { true }
    linked_at { Time.current }
    last_used_at { Time.current }

    trait :google do
      provider { "google" }
    end
  end
end
