# frozen_string_literal: true

FactoryBot.define do
  factory :minutes_entry do
    school
    minutes_book { association :minutes_book, school: school }
    kind { "meeting" }
    sequence(:title) { |n| "Ata de reunião #{n}" }
    held_on { Date.new(2026, 3, 10) }
    body { "<p>Discussed the school calendar.</p>" }

    trait :class_council do
      kind { "class_council" }
      school_class { association :school_class, school: school }
    end

    trait :final_results do
      kind { "final_results" }
    end

    # Two staff signers, each carrying the e-mail and CPF the provider requires.
    trait :with_signers do
      after(:create) do |entry|
        create_list(:minutes_participant, 2, :signer, minutes_entry: entry, school: entry.school)
      end
    end

    trait :pending_signature do
      with_signers

      after(:create) do |entry|
        entry.update_columns(
          status: "pending_signature", signature_provider: "fake",
          provider_document_id: "fake-doc-#{entry.id}", signature_requested_at: Time.current
        )
      end
    end

    trait :signed do
      pending_signature

      after(:create) do |entry|
        entry.update_columns(status: "signed", signed_at: Time.current)
      end
    end

    trait :cancelled do
      after(:create) do |entry|
        entry.update_columns(status: "cancelled", cancelled_at: Time.current)
      end
    end

    trait :discarded do
      discarded_at { Time.current }
    end
  end
end
