# frozen_string_literal: true

FactoryBot.define do
  factory :notification_delivery do
    school
    notification_intent { association :notification_intent, school: school }
    user
    channel { "push" }
    attempts { 0 }

    # The state machine refuses direct assignment (`no_direct_assignment: true`), so a fixture
    # past `queued` is moved through the same events the application uses — never by writing the
    # `status` column, which would let a spec build a delivery no code path can produce.
    trait :sent do
      after(:create, &:deliver!)
    end

    trait :failed do
      after(:create) do |delivery|
        delivery.error_code = "adapter_unavailable"
        delivery.fail!
      end
    end

    trait :skipped do
      after(:create, &:skip!)
    end
  end
end
