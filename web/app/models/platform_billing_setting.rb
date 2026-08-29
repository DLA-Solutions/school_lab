# frozen_string_literal: true

class PlatformBillingSetting < ApplicationRecord
  PROVIDERS = %w[asaas manual fake].freeze

  validates :active_provider, presence: true, inclusion: { in: PROVIDERS }
  validates :webhook_endpoint_token, presence: true, uniqueness: true

  def self.instance
    first || create!(
      active_provider: "manual",
      webhook_endpoint_token: ENV["PLATFORM_BILLING_WEBHOOK_TOKEN"].presence || SecureRandom.hex(24)
    )
  end
end
