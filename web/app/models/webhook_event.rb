# frozen_string_literal: true

class WebhookEvent < ApplicationRecord
  belongs_to :school, optional: true

  validates :provider, :provider_event_id, presence: true
  validates :provider_event_id, uniqueness: { scope: :provider }

  scope :processed, -> { where.not(processed_at: nil) }
  scope :unprocessed, -> { where(processed_at: nil) }
  scope :processed_before, ->(cutoff) { processed.where(processed_at: ...cutoff) }
end
