# frozen_string_literal: true

class TaxDeclaration < ApplicationRecord
  include SchoolAuditable

  belongs_to :school
  belongs_to :guardian
  belongs_to :active_version, class_name: "TaxDeclarationVersion", optional: true

  has_many :tax_declaration_versions, dependent: :restrict_with_error
  has_many :tax_declaration_access_events, dependent: :restrict_with_error

  validates :calendar_year, numericality: { only_integer: true, greater_than: 2000, less_than: 2100 }
  validates :guardian_id, uniqueness: { scope: %i[school_id calendar_year] }
end
