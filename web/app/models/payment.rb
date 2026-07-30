# frozen_string_literal: true

class Payment < ApplicationRecord
  STATUSES = %w[confirmed].freeze

  belongs_to :charge
  belongs_to :school

  validates :status, inclusion: { in: STATUSES }
  validates :psp_transaction_id, uniqueness: true, allow_nil: true
  validates :paid_amount, numericality: { greater_than: 0 }, allow_nil: true
end
