# frozen_string_literal: true

FactoryBot.define do
  factory :message do
    conversation
    school { conversation.school }
    sender_membership { association :membership, school: school }
    body { "Hello" }
    sent_at { Time.current }
  end
end
