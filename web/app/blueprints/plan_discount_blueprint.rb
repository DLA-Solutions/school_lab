# frozen_string_literal: true

class PlanDiscountBlueprint < Blueprinter::Base
  identifier :id

  fields :school_id, :name

  # A decimal on the wire would arrive as a string; the screen does arithmetic with it.
  field :percent do |discount|
    discount.percent.to_f
  end

  field :in_use do |discount|
    discount.contracts.kept.exists?
  end
end
