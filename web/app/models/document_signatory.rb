# frozen_string_literal: true

class DocumentSignatory < ApplicationRecord
  include Discard::Model
  include SchoolAuditable

  belongs_to :school

  has_many :report_card_configs, dependent: :restrict_with_error
  has_many :tax_declaration_settings, dependent: :restrict_with_error

  validates :role_label, :name, presence: true

  scope :active, -> { kept }
end
