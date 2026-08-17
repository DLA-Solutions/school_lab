# frozen_string_literal: true

class BillingPurpose < ApplicationRecord
  include Discard::Model
  include SchoolAuditable

  CODES = %w[
    tuition
    enrollment
    material
    activity
    transport
    meal
    fine
    interest
    other
  ].freeze

  DEFAULTS = [
    { code: "tuition", name: "Mensalidade" },
    { code: "enrollment", name: "Matrícula" }
  ].freeze

  belongs_to :school

  has_many :charges, dependent: :restrict_with_error

  validates :code, :name, presence: true
  validates :code, inclusion: { in: CODES }
  validates :code, uniqueness: { scope: :school_id, conditions: -> { kept } }, if: :kept?

  scope :ordered, -> { order(:code) }

  def self.provision_defaults!(school)
    DEFAULTS.each do |attributes|
      next if school.billing_purposes.kept.exists?(code: attributes[:code])

      school.billing_purposes.create!(attributes.merge(tax_declaration_eligible: false))
    end

    school.billing_purposes.kept.ordered
  end

  def self.find_or_provision!(school, code:)
    provision_defaults!(school)
    school.billing_purposes.kept.find_by!(code: code)
  end
end
