# frozen_string_literal: true

class BillingPurposeBlueprint < Blueprinter::Base
  identifier :id

  fields :code, :name, :tax_declaration_eligible
end
