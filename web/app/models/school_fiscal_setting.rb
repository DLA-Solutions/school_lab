# frozen_string_literal: true

class SchoolFiscalSetting < ApplicationRecord
  include SchoolAuditable

  TAXATION_TYPES = %w[taxationInMunicipality].freeze
  TAX_LOCATIONS = %w[companyMunicipality].freeze
  ISSUE_TYPES = %w[annfs website alt].freeze

  belongs_to :school

  validates :issuance_city_name, :issuance_state, :spedy_city_code, :taxation_type, :tax_location,
            presence: true
  validates :issuance_state, length: { is: 2 }
  validates :taxation_type, inclusion: { in: TAXATION_TYPES }
  validates :tax_location, inclusion: { in: TAX_LOCATIONS }
  validates :issue_type, inclusion: { in: ISSUE_TYPES }, allow_nil: true
  validates :iss_rate_percent, numericality: { greater_than_or_equal_to: 0, less_than_or_equal_to: 100 },
                               allow_nil: true
  validate :enabled_requires_complete_configuration, if: :enabled?

  def complete_for_issuance?
    spedy_city_code.present? &&
      iss_rate_percent.present? &&
      federal_service_code.present? &&
      service_description.present?
  end

  private

  def enabled_requires_complete_configuration
    return if complete_for_issuance?

    errors.add(:enabled, :incomplete_configuration)
  end
end
