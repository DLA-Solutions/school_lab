# frozen_string_literal: true

class Charge < ApplicationRecord
  include Discard::Model
  include SchoolAuditable
  include ChargeStateMachine

  belongs_to :contract
  belongs_to :school
  belongs_to :guardian
  belongs_to :discarded_by, class_name: "User", optional: true

  has_many :applied_discounts, dependent: :destroy
  has_many :payments, dependent: :destroy

  validates :billing_period, presence: true
  validates :total_amount, numericality: { greater_than_or_equal_to: 0 }, allow_nil: true
  validates :psp_charge_id, uniqueness: true, allow_nil: true

  scope :open, -> { kept.where(status: %w[pending overdue]) }
end
