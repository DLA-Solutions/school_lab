# frozen_string_literal: true

FactoryBot.define do
  factory :minutes_participant do
    school
    minutes_entry { association :minutes_entry, school: school }
    sequence(:name) { |n| "Participant #{n}" }
    role_label { "Teacher" }
    signs { false }

    trait :signer do
      signs { true }
      sequence(:email) { |n| "signer#{n}@example.com" }
      # A real document — CPF check digits are validated — derived from the sequence.
      sequence(:cpf) do |n|
        base = ::Kernel.format("%09d", (n + 500_000_000) % 1_000_000_000)
        first = Cpf.check_digit(base.chars.map(&:to_i))
        second = Cpf.check_digit("#{base}#{first}".chars.map(&:to_i))
        "#{base}#{first}#{second}"
      end
    end
  end
end
