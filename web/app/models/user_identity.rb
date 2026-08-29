# frozen_string_literal: true

class UserIdentity < ApplicationRecord
  PROVIDERS = %w[google].freeze

  belongs_to :user

  validates :provider, presence: true, inclusion: { in: PROVIDERS }
  validates :provider_uid, presence: true, uniqueness: { scope: :provider }
  validates :email, presence: true
  validates :linked_at, presence: true
  validates :user_id, uniqueness: { scope: :provider }
end
