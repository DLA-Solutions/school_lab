# frozen_string_literal: true

class Contract < ApplicationRecord
  include Discard::Model
  include SchoolAuditable

  STATUSES = %w[active suspended ended].freeze

  belongs_to :student
  belongs_to :school
  belongs_to :billing_plan

  has_many :charges, dependent: :destroy

  validates :status, inclusion: { in: STATUSES }
  validates :due_day, numericality: { only_integer: true, greater_than_or_equal_to: 1, less_than_or_equal_to: 28 },
                      allow_nil: true
  validates :negotiated_amount_cents, numericality: { only_integer: true, greater_than_or_equal_to: 0 }, allow_nil: true

  scope :active, -> { kept.where(status: "active") }
end
