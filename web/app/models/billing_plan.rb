# frozen_string_literal: true

class BillingPlan < ApplicationRecord
  include Discard::Model
  include SchoolAuditable

  PLAN_TYPES = %w[tuition enrollment fee].freeze

  belongs_to :school

  has_many :contracts, dependent: :destroy

  validates :name, presence: true
  validates :plan_type, inclusion: { in: PLAN_TYPES }, allow_nil: true
  validates :base_amount, numericality: { greater_than_or_equal_to: 0 }, allow_nil: true
end
