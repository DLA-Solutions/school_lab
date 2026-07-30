# frozen_string_literal: true

class DeviceToken < ApplicationRecord
  include Discard::Model

  PLATFORMS = %w[ios android web].freeze

  belongs_to :user

  validates :token, presence: true, uniqueness: { conditions: -> { kept } }
  validates :platform, inclusion: { in: PLATFORMS }
end
