# frozen_string_literal: true

FactoryBot.define do
  factory :school_group do
    sequence(:name) { |n| "School Group #{n}" }
  end

  factory :school do
    school_group
    sequence(:name) { |n| "Example School #{n}" }
    cnpj { "00.000.000/0001-00" }
  end

  factory :user do
    sequence(:email) { |n| "user#{n}@example.com" }
    password { "password123" }
    password_confirmation { "password123" }
    status { "active" }
    confirmed_at { Time.current }

    trait :disabled do
      status { "disabled" }
      disabled_at { Time.current }
    end
  end

  factory :membership do
    user
    school
    role { "guardian" }
    status { "active" }

    trait :backoffice do
      role { "backoffice" }
      school { nil }
    end

    trait :suspended do
      status { "suspended" }
      suspended_at { Time.current }
    end
  end

  factory :refresh_token do
    user
    token_digest { Digest::SHA256.hexdigest(SecureRandom.urlsafe_base64(32)) }
    expires_at { 90.days.from_now }
    created_at { Time.current }
  end

  factory :device_token do
    user
    sequence(:token) { |n| "fcm-token-#{n}" }
    platform { "android" }
  end
end
