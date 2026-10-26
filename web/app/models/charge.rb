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
  scope :with_status, ->(statuses) { where(status: statuses) }
  # Both bounds are inclusive and optional; a charge with no due date never matches a bound.
  scope :due_between, lambda { |from = nil, to = nil|
    relation = all
    relation = relation.where(due_date: from..) if from
    relation = relation.where(due_date: ..to) if to
    relation
  }
  # Newest due date first; undated charges sink to the end instead of leading a descending list.
  scope :by_due_date, lambda { |direction = :desc|
    order(arel_table[:due_date].public_send(direction == :asc ? :asc : :desc).nulls_last, id: direction)
  }

  # Reads the preloaded association when a list eager-loaded `:charge_issuances`, so rendering
  # many charges does not run one query each; otherwise asks the database.
  def current_issuance
    if charge_issuances.loaded?
      charge_issuances.reject(&:cancelled?).max_by { |issuance| [ issuance.created_at, issuance.id ] }
    else
      charge_issuances.where.not(status: "cancelled").order(created_at: :desc).first
    end
  end

  # A boleto PDF can be served only while the charge is still payable and its current issuance
  # has a registered boleto at a provider that serves PDFs (see ChargeIssuance#boleto_pdf_available?).
  def boleto_pdf_available?
    kept? && (pending? || overdue?) && (current_issuance&.boleto_pdf_available? || false)
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
