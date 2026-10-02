# frozen_string_literal: true

class NotificationDelivery < ApplicationRecord
  include NotificationDeliveryStateMachine

  CHANNELS = %w[push email whatsapp].freeze

  belongs_to :school
  belongs_to :notification_intent
  belongs_to :user

  validates :channel, inclusion: { in: CHANNELS }
  validates :user_id, uniqueness: { scope: %i[notification_intent_id channel] }
end
