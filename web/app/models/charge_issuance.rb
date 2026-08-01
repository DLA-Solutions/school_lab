# frozen_string_literal: true

class ChargeIssuance < ApplicationRecord
  include SchoolAuditable
  include ChargeIssuanceStateMachine

  belongs_to :charge
  belongs_to :school

  validates :idempotency_key, :provider, :amount_cents, :due_date, :status, presence: true
  validates :amount_cents, numericality: { only_integer: true, greater_than_or_equal_to: 0 }
  validates :provider_invoice_id, uniqueness: true, allow_nil: true
  validates :idempotency_key, uniqueness: true

  before_validation :snapshot_from_charge, on: :create

  def self.find_by_provider_invoice_id!(provider_invoice_id)
    find_by!(provider_invoice_id: provider_invoice_id)
  end

  private

  def snapshot_from_charge
    return unless charge

    self.amount_cents ||= charge.total_amount_cents
    self.due_date ||= charge.due_date
    self.school_id ||= charge.school_id
  end
end
