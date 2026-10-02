# frozen_string_literal: true

# One row per domain event fan-out (BR-N01, UC-N01) — e.g. a report card being published, or
# (once BC1 ships) a message being posted. `payload` carries only what a push needs to render
# (title/body/deep-link context) — never full message or document body text (LGPD minimization).
class NotificationIntent < ApplicationRecord
  belongs_to :school

  has_many :notification_deliveries, dependent: :destroy

  validates :channel_key, :source_type, presence: true
  validates :source_id, presence: true,
                         uniqueness: { scope: %i[source_type channel_key] }
end
