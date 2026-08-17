# frozen_string_literal: true

class TaxDeclarationSetting < ApplicationRecord
  include SchoolAuditable

  belongs_to :school
  belongs_to :document_signatory, optional: true
  belongs_to :approved_by, class_name: "User", optional: true

  validates :configuration_version, numericality: { only_integer: true, greater_than: 0 }

  def self.for(school)
    find_or_initialize_by(school: school)
  end
end
