# frozen_string_literal: true

FactoryBot.define do
  factory :notification_policy do
    school
    channel_key { "report_cards" }
    push_enabled { true }
    email_enabled { false }
    whatsapp_enabled { false }

    trait :push_disabled do
      push_enabled { false }
    end
  end
end
