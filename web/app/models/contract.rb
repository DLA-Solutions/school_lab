# frozen_string_literal: true

class Contract < ApplicationRecord
  include Discard::Model
  include SchoolAuditable

  STATUSES = %w[active suspended ended].freeze

  # Where the contract stands with the family. No e-signature provider is integrated: the school
  # sends the contract and marks it signed once the family returns it.
  SIGNATURE_STATUSES = %w[pending_signature signed].freeze

  belongs_to :student
  belongs_to :school
  belongs_to :billing_plan

  has_many :charges, dependent: :destroy

  validates :status, inclusion: { in: STATUSES }
  validates :signature_status, inclusion: { in: SIGNATURE_STATUSES }
  validates :due_day, numericality: { only_integer: true, greater_than_or_equal_to: 1, less_than_or_equal_to: 28 },
                      allow_nil: true
  validates :negotiated_amount_cents, numericality: { only_integer: true, greater_than_or_equal_to: 0 }, allow_nil: true

  scope :active, -> { kept.where(status: "active") }
  scope :signed, -> { kept.where(signature_status: "signed") }
  scope :pending_signature, -> { kept.where(signature_status: "pending_signature") }

  def signed?
    signature_status == "signed"
  end

  # Idempotent: re-marking a signed contract keeps the original signature date rather than
  # quietly moving it forward.
  def mark_signed!
    return true if signed?

    update(signature_status: "signed", signed_at: Time.current)
  end
end
