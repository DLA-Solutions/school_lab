# frozen_string_literal: true

# A band the school grants against the full tuition: a sibling rate, a scholarship. Applied to a
# `BillingPlan`'s full amount to produce what a family actually pays.
class PlanDiscount < ApplicationRecord
  include Discard::Model
  include SchoolAuditable

  # What a school starts with. Editable and extendable — every school names its bands differently.
  DEFAULTS = [
    { name: "Desconto 10%", percent: 10 },
    { name: "Desconto 20%", percent: 20 },
    { name: "Desconto 30%", percent: 30 },
    { name: "Desconto 40%", percent: 40 },
    { name: "Bolsa integral", percent: 100 }
  ].freeze

  belongs_to :school
  belongs_to :discarded_by, class_name: "User", optional: true

  has_many :contracts, dependent: :nullify

  validates :name, presence: true
  validates :percent, numericality: { greater_than_or_equal_to: 0, less_than_or_equal_to: 100 }
  validates :name, uniqueness: { scope: :school_id, conditions: -> { kept } }, if: :kept?

  scope :ordered, -> { order(:percent, :name) }

  # What is left of an amount after this band. Rounded to the cent, since money is an integer here.
  def apply_to(cents)
    return cents if cents.blank?

    (cents * (100 - percent.to_d) / 100).round
  end

  def self.provision_defaults!(school)
    DEFAULTS.each do |attributes|
      next if school.plan_discounts.kept.exists?(name: attributes[:name])

      school.plan_discounts.create!(attributes)
    end

    school.plan_discounts.kept.ordered
  end
end
