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

    trait :school_admin do
      role { "school" }
    end

    trait :invited do
      status { "invited" }
    end

    trait :suspended do
      status { "suspended" }
      suspended_at { Time.current }
    end
  end

  factory :guardian do
    school
    sequence(:name) { |n| "Guardian #{n}" }
    sequence(:email) { |n| "guardian#{n}@example.com" }
    cpf { "123.456.789-00" }
    phone { "+55 11 99999-0000" }
  end

  factory :student do
    school
    sequence(:name) { |n| "Student #{n}" }
    status { "active" }
    birth_date { Date.new(2015, 3, 10) }
  end

  factory :student_guardian do
    school
    student { association :student, school: school }
    guardian { association :guardian, school: school }
    financial_percentage { 50 }
    primary_guardian { true }
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
