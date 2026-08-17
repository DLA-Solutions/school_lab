# frozen_string_literal: true

class ServiceInvoiceAttempt < ApplicationRecord
  belongs_to :service_invoice
  belongs_to :school

  include ServiceInvoiceAttemptStateMachine

  validates :provider, :idempotency_key, :status, presence: true
  validates :idempotency_key, uniqueness: true

  before_validation :snapshot_from_invoice, on: :create

  private

  def snapshot_from_invoice
    return unless service_invoice

    self.school_id ||= service_invoice.school_id
    self.provider ||= service_invoice.provider
  end
end
