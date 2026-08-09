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

    trait :staff do
      role { "staff" }
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
    phone { "+55 11 99999-0000" }

    # The address is required in full, so every guardian fixture carries one.
    zip_code { "01310100" }
    street { "Avenida Paulista" }
    number { "1000" }
    neighborhood { "Bela Vista" }
    city { "São Paulo" }
    state { "SP" }

    # CPF is unique per school and its check digits are validated, so a literal would collide the
    # moment a spec builds two guardians in one school. Derive a real document from the sequence.
    sequence(:cpf) do |n|
      base = ::Kernel.format("%09d", n % 1_000_000_000)
      first = Cpf.check_digit(base.chars.map(&:to_i))
      second = Cpf.check_digit("#{base}#{first}".chars.map(&:to_i))
      "#{base}#{first}#{second}"
    end
  end

  factory :school_class do
    school
    sequence(:name) { |n| ("A".."Z").to_a[n % 26] }
    grade_level { "fundamental_i_1" }
    year { 2026 }
  end

  factory :subject do
    school
    sequence(:name) { |n| "Subject #{n}" }
  end

  factory :job_position do
    school
    sequence(:name) { |n| "Cargo #{n}" }
  end

  factory :teacher do
    school
    sequence(:name) { |n| "Teacher #{n}" }
    sequence(:email) { |n| "teacher#{n}@example.com" }
    phone { "+55 11 98888-0000" }
    job_position { association :job_position, school: school }
    hired_on { Date.new(2024, 2, 1) }

    sequence(:cpf) do |n|
      base = ::Kernel.format("%09d", (n + 700_000) % 1_000_000_000)
      first = Cpf.check_digit(base.chars.map(&:to_i))
      second = Cpf.check_digit("#{base}#{first}".chars.map(&:to_i))
      "#{base}#{first}#{second}"
    end
  end

  factory :teaching_assignment do
    school
    teacher { association :teacher, school: school }
    school_class { association :school_class, school: school }
    subject { association :subject, school: school }
  end

  factory :student do
    school
    sequence(:name) { |n| "Student #{n}" }
    status { "active" }
    birth_date { Date.new(2015, 3, 10) }
    sequence(:rg) { |n| "MG-#{n.to_s.rjust(8, '0')}" }
    school_class { association :school_class, school: school }

    # Unique per school with validated check digits, exactly like the guardian factory.
    sequence(:cpf) do |n|
      base = ::Kernel.format("%09d", (n + 500_000) % 1_000_000_000)
      first = Cpf.check_digit(base.chars.map(&:to_i))
      second = Cpf.check_digit("#{base}#{first}".chars.map(&:to_i))
      "#{base}#{first}#{second}"
    end
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

  factory :plan_discount do
    school
    sequence(:name) { |n| "Desconto #{n}" }
    percent { 10 }
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
    # Comfortably in the future, so a charge is neither overdue nor inside the "due soon"
    # window unless an example says so. A fixed calendar date silently changes meaning as the
    # real clock passes it: the previous 2026-08-10 default was about to put every charge
    # inside Billing::UnissuedCharges' alert window for good.
    due_date { 30.days.from_now.to_date }

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
      after(:create) do |charge|
        create(:charge_issuance, :issued, charge: charge, school: charge.school)
        charge.sync_invoice_cache!
      end
    end
  end

  factory :charge_issuance do
    school
    charge { association :charge, school: school }
    provider { "fake" }
    sequence(:idempotency_key) { |n| "issuance-key-#{n}" }
    amount_cents { charge.total_amount_cents }
    due_date { charge.due_date }

    trait :issued do
      sequence(:provider_invoice_id) { |n| "fake-invoice-#{n}" }
      boleto_url { "https://fake-psp.example/boleto/test" }
      digitable_line { "23793.38128 60000.000003 00000.000401 1 84340000085000" }
      barcode { "237918434000008500033812860000000000000000401" }
      our_number { "000000401" }
      pix_emv { "00020126580014br.gov.bcb.pixtest" }

      after(:create, &:issue!)
    end

    trait :failed do
      last_error { "Provider timeout" }

      after(:create, &:mark_failed!)
    end

    trait :cancelled do
      after(:create, &:cancel!)
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
    school
    provider { "fake" }
    sequence(:provider_event_id) { |n| "evt-#{n}" }
    event_type { "payment.confirmed" }
    provider_resource_id { "fake-invoice-1" }
    payload { "{}" }
  end

  factory :school_payment_provider do
    school
    instrument { "bank_slip" }
    # `fake` by default: a configuration must be complete to be valid, and the fake provider is
    # the only one that needs no credentials. Use `:cora` (or pass a pair) for a real provider.
    provider { "fake" }
    active { true }
    settings { {} }
    client_id { "client-test-123" }
    uploaded_at { Time.current }
    sequence(:webhook_endpoint_token) { |n| "webhook-token-#{n}-#{SecureRandom.urlsafe_base64(16)}" }

    trait :cora do
      provider { "cora" }

      transient do
        pair { OpensslCertificateHelper.generate_certificate_pair }
      end

      certificate_pem { pair[:certificate_pem] }
      private_key_pem { pair[:private_key_pem] }
    end

    trait :active do
      active { true }
    end

    trait :inactive do
      active { false }
    end
  end

  factory :school_signature_provider do
    school
    # `fake` by default: the Autentique adapter needs a real token, and a spec that wants one
    # passes `:autentique`.
    provider { "fake" }
    active { true }
    webhook_secret { "webhook-secret" }
    uploaded_at { Time.current }

    trait :autentique do
      provider { "autentique" }
      api_token { "autentique-test-token" }
    end
  end

  factory :school_billing_settings do
    school
    overdue_grace_days { 3 }
    service_description { "Mensalidade escolar" }
    notification_schedule { SchoolBillingSettings.default_notification_schedule }

    trait :issuance_ready do
      interest_rate_percent { 1.0 }
    end
  end
end
