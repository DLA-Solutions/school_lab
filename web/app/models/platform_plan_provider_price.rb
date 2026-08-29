# frozen_string_literal: true

class PlatformPlanProviderPrice < ApplicationRecord
  PROVIDERS = %w[asaas manual fake].freeze
  INTERVALS = %w[month year].freeze

  belongs_to :platform_plan

  validates :provider, presence: true, inclusion: { in: PROVIDERS }
  validates :billing_interval, presence: true, inclusion: { in: INTERVALS }
  validates :amount_cents, presence: true, numericality: { greater_than_or_equal_to: 0 }
  validates :billing_interval, uniqueness: { scope: [ :platform_plan_id, :provider ] }

  scope :active, -> { where(active: true) }
end
