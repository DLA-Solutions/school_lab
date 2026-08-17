# frozen_string_literal: true

class TaxDeclarationItem < ApplicationRecord
  belongs_to :school
  belongs_to :tax_declaration_version
  belongs_to :student
  belongs_to :payment
  belongs_to :charge

  validates :billing_purpose_code, :paid_at, presence: true
  validates :source_paid_amount_cents, :source_fine_amount_cents, :source_interest_amount_cents,
            :declared_principal_amount_cents,
            numericality: { only_integer: true, greater_than_or_equal_to: 0 }
  validates :payment_id, uniqueness: { scope: :tax_declaration_version_id }
end
