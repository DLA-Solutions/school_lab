# frozen_string_literal: true

class ProvisioningImport < ApplicationRecord
  STATUSES = %w[previewed committed failed].freeze

  belongs_to :school
  belongs_to :uploaded_by, class_name: "User"

  validates :status, inclusion: { in: STATUSES }
  validates :row_count, numericality: { only_integer: true, greater_than_or_equal_to: 0 }, allow_nil: true
end
