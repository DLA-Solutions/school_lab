# frozen_string_literal: true

class TaxDeclarationVersion < ApplicationRecord
  belongs_to :school
  belongs_to :tax_declaration
  belongs_to :supersedes, class_name: "TaxDeclarationVersion", optional: true

  has_many :tax_declaration_items, dependent: :restrict_with_error
  has_many :tax_declaration_access_events, dependent: :restrict_with_error

  validates :version, :calculation_digest, :verification_code, :pdf_storage_key, presence: true
  validates :total_declared_principal_amount_cents,
            numericality: { only_integer: true, greater_than_or_equal_to: 0 }
  validates :settings_version, numericality: { only_integer: true, greater_than: 0 }
  validates :version, uniqueness: { scope: :tax_declaration_id }
  validates :calculation_digest, uniqueness: { scope: :tax_declaration_id }
  validates :verification_code, uniqueness: true

  def active?
    tax_declaration.active_version_id == id
  end

  def lifecycle
    active? ? "active" : "superseded"
  end
end
