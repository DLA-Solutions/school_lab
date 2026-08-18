# frozen_string_literal: true

class ServiceInvoice < ApplicationRecord
  include SchoolAuditable
  include ServiceInvoiceStateMachine

  belongs_to :school
  belongs_to :payment
  belongs_to :charge
  has_many :service_invoice_attempts, dependent: :destroy

  has_one_attached :pdf
  has_one_attached :xml

  validates :provider, :integration_id, :status, presence: true
  validates :integration_id, uniqueness: true
  validates :payment_id, uniqueness: true
  validates :provider_document_id, uniqueness: true, allow_nil: true

  def self.integration_id_for(payment)
    "pay-#{payment.id}"
  end

  def current_attempt
    service_invoice_attempts.order(created_at: :desc).first
  end
end
