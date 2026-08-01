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

  factory :billing_plan do
    school
    sequence(:name) { |n| "Tuition Plan #{n}" }
    plan_type { "tuition" }
    base_amount_cents { 90_000 }
  end

  factory :contract do
    school
    student { association :student, school: school }
    billing_plan { association :billing_plan, school: school }
    negotiated_amount_cents { 85_000 }
    due_day { 10 }
    starts_on { Date.new(2026, 1, 1) }
    status { "active" }
  end

  factory :charge do
    school
    contract { association :contract, school: school }
    guardian { association :guardian, school: school }
    sequence(:billing_period) { |n| Date.new(2026, 1, 1) >> (n - 1) }
    original_amount_cents { 90_000 }
    discount_amount_cents { 5_000 }
    late_fee_amount_cents { 0 }
    total_amount_cents { 85_000 }
    due_date { Date.new(2026, 8, 10) }

    trait :overdue do
      due_date { Date.yesterday }

      after(:create) do |charge|
        charge.mark_overdue! if charge.may_mark_overdue?
      end
    end

    trait :paid do
      after(:create, &:pay!)
    end

    trait :cancelled do
      after(:create) do |charge|
        charge.cancel! if charge.may_cancel?
      end
    end

    trait :issued do
      provider_invoice_id { "fake-#{SecureRandom.hex(4)}" }
      boleto_url { "https://fake-psp.example/boleto/test" }
      pix_copy_paste { "00020126580014br.gov.bcb.pixtest" }
    end
  end

  factory :payment do
    school
    charge { association :charge, :issued, school: school }
    paid_amount_cents { 85_000 }
    payment_method { "pix" }
    sequence(:provider_payment_id) { |n| "txn-#{n}" }
    paid_at { Time.current }
    status { "confirmed" }
  end

  factory :webhook_event do
    provider { "fake" }
    sequence(:provider_event_id) { |n| "evt-#{n}" }
    event_type { "payment.confirmed" }
    payload { "{}" }
  end

  factory :school_payment_provider do
    school
    instrument { "bank_slip" }
    provider { "cora" }
    environment { "stage" }
    active { true }
    settings { {} }
    client_id { "client-test-123" }
    uploaded_at { Time.current }

    trait :active do
      active { true }
    end

    trait :inactive do
      active { false }
    end
  end
end
