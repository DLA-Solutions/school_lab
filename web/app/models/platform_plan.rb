# frozen_string_literal: true

class PlatformPlan < ApplicationRecord
  include Discard::Model

  KEYS = %w[starter pro enterprise].freeze

  has_many :platform_subscriptions, dependent: :restrict_with_error
  has_many :platform_plan_provider_prices, dependent: :destroy

  validates :key, presence: true, inclusion: { in: KEYS }, uniqueness: { conditions: -> { kept } }
  validates :name, presence: true
  validates :monthly_amount_cents, presence: true, numericality: { greater_than_or_equal_to: 0 }
end
