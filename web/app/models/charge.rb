# frozen_string_literal: true

class Charge < ApplicationRecord
  include Discard::Model
  include SchoolAuditable
  include ChargeStateMachine

  belongs_to :contract
  belongs_to :school
  belongs_to :guardian
  belongs_to :discarded_by, class_name: "User", optional: true

  has_many :applied_discounts, dependent: :destroy
  has_many :charge_issuances, dependent: :destroy
  has_many :payments, dependent: :destroy

  validates :billing_period, presence: true
  validates :original_amount_cents, :total_amount_cents, presence: true
  validates :original_amount_cents, :discount_amount_cents, :late_fee_amount_cents, :total_amount_cents,
            numericality: { only_integer: true, greater_than_or_equal_to: 0 }
  validates :provider_invoice_id, uniqueness: true, allow_nil: true

  scope :open, -> { kept.where(status: %w[pending overdue]) }

  def current_issuance
    charge_issuances.where.not(status: "cancelled").order(created_at: :desc).first
  end

  def sync_invoice_cache!
    issuance = current_issuance
    return clear_invoice_cache! unless issuance&.issued?

    update!(
      provider_invoice_id: issuance.provider_invoice_id,
      boleto_url: issuance.boleto_url,
      pix_copy_paste: issuance.pix_emv
    )
  end

  def clear_invoice_cache!
    update!(
      provider_invoice_id: nil,
      boleto_url: nil,
      pix_copy_paste: nil
    )
  end
end
