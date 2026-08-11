# frozen_string_literal: true

FactoryBot.define do
  factory :collection_reminder_delivery do
    school
    charge { association :charge, school: school }
    rule_key { "days_after_due:3" }
    sent_on { Date.current }
  end
end
