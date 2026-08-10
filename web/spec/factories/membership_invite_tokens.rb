# frozen_string_literal: true

FactoryBot.define do
  factory :membership_invite_token do
    membership factory: %i[membership invited]
    school { membership.school }
    token_digest { Digest::SHA256.hexdigest(SecureRandom.urlsafe_base64(32)) }
    expires_at { 7.days.from_now }

    trait :used do
      used_at { Time.current }
    end

    trait :expired do
      expires_at { 1.day.ago }
    end
  end
end
