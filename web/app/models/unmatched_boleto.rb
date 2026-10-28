# frozen_string_literal: true

# A bank-created boleto (Banco Inter only, for now) whose payer CPF, as reported by the bank,
# matched no kept guardian at the school whose credential was polled
# (Billing::ImportExternalBoletosService). Queued here instead of dropped, so staff can link it
# to the right guardian (Billing::ResolveUnmatchedBoletoService) or dismiss it.
class UnmatchedBoleto < ApplicationRecord
  include SchoolAuditable

  STATUSES = %w[pending resolved dismissed].freeze
  # Mirrors Gateways::BankSlip::StatusNormalizer::INTERNAL_STATUSES — the bank's own invoice
  # status, as last synced, distinct from this record's own review `status` above.
  PROVIDER_STATUSES = Gateways::BankSlip::StatusNormalizer::INTERNAL_STATUSES

  belongs_to :school
  belongs_to :resolved_by, class_name: "User", optional: true
  belongs_to :resolved_guardian, class_name: "Guardian", optional: true
  belongs_to :charge, optional: true

  validates :provider, :provider_invoice_id, :payer_cpf, presence: true
  validates :provider_invoice_id, uniqueness: { scope: :school_id }
  validates :amount_cents, presence: true,
                           numericality: { only_integer: true, greater_than_or_equal_to: 0 }
  validates :paid_amount_cents, numericality: { only_integer: true, greater_than_or_equal_to: 0 },
                                allow_nil: true
  validates :status, inclusion: { in: STATUSES }
  validates :provider_status, inclusion: { in: PROVIDER_STATUSES }
  # A dismissed item has no guardian to link; a resolved one must name who it was linked to.
  validates :resolved_guardian_id, presence: true, if: -> { status == "resolved" }

  scope :pending_review, -> { where(status: "pending") }

  def pending?
    status == "pending"
  end
end
