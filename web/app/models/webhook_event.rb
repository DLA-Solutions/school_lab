# frozen_string_literal: true

class WebhookEvent < ApplicationRecord
  belongs_to :school, optional: true

  validates :provider, :provider_event_id, presence: true
  validates :provider_event_id, uniqueness: { scope: :provider }
end
