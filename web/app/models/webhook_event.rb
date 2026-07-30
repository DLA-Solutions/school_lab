# frozen_string_literal: true

class WebhookEvent < ApplicationRecord
  validates :psp_event_id, presence: true, uniqueness: true
end
