# frozen_string_literal: true

class Payment < ApplicationRecord
  STATUSES = %w[confirmed].freeze

  belongs_to :charge
  belongs_to :school

  validates :status, inclusion: { in: STATUSES }
  validates :provider_payment_id, uniqueness: true, allow_nil: true
  validates :paid_amount_cents, presence: true
  validates :paid_amount_cents, numericality: { only_integer: true, greater_than: 0 }
end
