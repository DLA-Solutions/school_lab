# frozen_string_literal: true

class Charge < ApplicationRecord
  include Discard::Model
  include SchoolAuditable
  include ChargeStateMachine

  # A tuition charge always comes from a contract. A one-off may not: the school also bills for
  # things nobody signed a contract about, and the slip only needs a payer to exist.
  belongs_to :contract, optional: true
  belongs_to :school
  belongs_to :guardian
  belongs_to :billing_purpose, optional: true
  belongs_to :discarded_by, class_name: "User", optional: true

  has_many :applied_discounts, dependent: :destroy
  has_many :charge_issuances, dependent: :destroy
  has_many :payments, dependent: :destroy
  has_one :service_invoice, dependent: :destroy
  has_many :collection_reminder_deliveries, dependent: :destroy

  validates :billing_period, presence: true
  validates :original_amount_cents, :total_amount_cents, presence: true
  validates :original_amount_cents, :discount_amount_cents, :late_fee_amount_cents, :total_amount_cents,
            numericality: { only_integer: true, greater_than_or_equal_to: 0 }
  validates :provider_invoice_id, uniqueness: true, allow_nil: true

  # `tuition` comes from the monthly schedule; `one_off` is raised by hand for something else.
  KINDS = %w[tuition one_off].freeze

  validates :kind, inclusion: { in: KINDS }
  # The monthly schedule reads the amount and the payer off a contract, so a tuition charge
  # without one has nothing to have been generated from.
  validates :contract, presence: true, if: -> { kind == "tuition" }

  scope :open, -> { kept.where(status: %w[pending overdue]) }
  scope :one_off, -> { kept.where(kind: "one_off") }

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
