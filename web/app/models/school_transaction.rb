# frozen_string_literal: true

# A movement in the school's own ledger — money in or money out — for the things a boleto does not
# explain: textbooks sold at the counter, a grant received, the payroll paid.
class SchoolTransaction < ApplicationRecord
  include Discard::Model
  include SchoolAuditable

  KINDS = %w[income expense].freeze

  # `didactic_material` is called out on the dashboard as its own KPI; the rest are there so a
  # school can classify a movement instead of leaving every line as "other".
  CATEGORIES = %w[
    didactic_material
    tuition
    enrolment_fee
    events
    donation
    payroll
    rent
    utilities
    supplies
    maintenance
    taxes
    other
  ].freeze

  belongs_to :school
  belongs_to :discarded_by, class_name: "User", optional: true

  validates :kind, inclusion: { in: KINDS }
  validates :category, inclusion: { in: CATEGORIES }
  validates :amount_cents, numericality: { only_integer: true, greater_than_or_equal_to: 0 }
  validates :occurred_on, presence: true

  scope :income, -> { kept.where(kind: "income") }
  scope :expense, -> { kept.where(kind: "expense") }
  scope :occurred_in, ->(range) { kept.where(occurred_on: range) }
  scope :ordered, -> { order(occurred_on: :desc, id: :desc) }

  # What the movement did to the school's balance: an expense of R$100 is -10_000.
  def signed_amount_cents
    kind == "expense" ? -amount_cents : amount_cents
  end
end
