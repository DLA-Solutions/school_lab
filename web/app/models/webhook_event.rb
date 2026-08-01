# frozen_string_literal: true

class WebhookEvent < ApplicationRecord
  validates :provider, :provider_event_id, presence: true
  validates :provider_event_id, uniqueness: { scope: :provider }
end
