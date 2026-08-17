# frozen_string_literal: true

class Contract < ApplicationRecord
  include Discard::Model
  include SchoolAuditable

  STATUSES = %w[active suspended ended].freeze

  # Where the contract stands with the family. No e-signature provider is integrated: the school
  # sends the contract and marks it signed once the family returns it.
  # `cancelled` is a contract the school called off before it was signed — a wrong figure to
  # reissue, or a family that decided not to go ahead. It stays on record rather than being
  # deleted, because when the reason was an error it is the context for the corrected contract
  # that follows it.
  SIGNATURE_STATUSES = %w[pending_signature signed cancelled].freeze

  belongs_to :student
  belongs_to :school
  belongs_to :billing_plan
  belongs_to :plan_discount, optional: true

  # Who the boletos are registered against. Both parents sign; one of them pays, and the bank
  # slip carries that person's CPF.
  belongs_to :payer_guardian, class_name: "Guardian", optional: true

  has_many :charges, dependent: :destroy

  validates :status, inclusion: { in: STATUSES }
  validates :signature_status, inclusion: { in: SIGNATURE_STATUSES }
  validate :payer_guardian_is_a_signer
  validates :due_day, numericality: { only_integer: true, greater_than_or_equal_to: 1, less_than_or_equal_to: 28 },
                      allow_nil: true
  validates :negotiated_amount_cents, numericality: { only_integer: true, greater_than_or_equal_to: 0 }, allow_nil: true

  scope :active, -> { kept.where(status: "active") }
  scope :signed, -> { kept.where(signature_status: "signed") }
  scope :pending_signature, -> { kept.where(signature_status: "pending_signature") }
  scope :signature_cancelled, -> { kept.where(signature_status: "cancelled") }

  def signed?
    signature_status == "signed"
  end

  def signature_cancelled?
    signature_status == "cancelled"
  end

  # Only what the family has not signed yet. A signed contract is an agreement in force —
  # undoing it is a rescission, not a button on a listing.
  def signature_cancellable?
    signature_status == "pending_signature"
  end

  # Who has to sign: the guardians of the student, one or two. The API requires a guardian to
  # carry an e-mail and a CPF, so every signer is reachable and identifiable.
  # Falls back to the first guardian on file, which is who a charge would have named anyway.
  def payer
    payer_guardian || signers.first
  end

  def signers
    student.student_guardians.kept.includes(:guardian).map(&:guardian)
  end

  # The payer has to be one of the student's own guardians — a boleto in a stranger's name is
  # not a billing choice, it is a mistake.
  def payer_guardian_is_a_signer
    return if payer_guardian.blank? || student.blank?
    return if student.student_guardians.kept.exists?(guardian_id: payer_guardian_id)

    errors.add(:payer_guardian, :invalid)
  end

  # Idempotent: re-marking a signed contract keeps the original signature date rather than
  # quietly moving it forward.
  def mark_signed!
    return true if signed?

    update(signature_status: "signed", signed_at: Time.current)
  end
end
