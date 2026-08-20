# frozen_string_literal: true

class PlatformInvoice < ApplicationRecord
  STATUSES = %w[draft open paid void uncollectible].freeze
  PAYMENT_METHODS = %w[credit_card bank_slip pix].freeze
  PROVIDERS = %w[asaas manual fake].freeze

  belongs_to :school
  belongs_to :platform_subscription

  audited associated_with: :school

  validates :provider, presence: true, inclusion: { in: PROVIDERS }
  validates :status, presence: true, inclusion: { in: STATUSES }
  validates :amount_cents, presence: true, numericality: { greater_than_or_equal_to: 0 }
  validates :payment_method, inclusion: { in: PAYMENT_METHODS }, allow_nil: true
  validates :external_invoice_id, uniqueness: { scope: :provider }, allow_nil: true

  scope :open_status, -> { where(status: "open") }
end
