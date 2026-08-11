# frozen_string_literal: true

class AppliedDiscountBlueprint < Blueprinter::Base
  identifier :id

  fields :discount_type, :amount_cents
end
