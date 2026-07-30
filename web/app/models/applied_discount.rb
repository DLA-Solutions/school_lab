# frozen_string_literal: true

class AppliedDiscount < ApplicationRecord
  include Discard::Model
  include SchoolAuditable

  belongs_to :charge
  belongs_to :school

  validates :amount, numericality: { greater_than_or_equal_to: 0 }, allow_nil: true
end
