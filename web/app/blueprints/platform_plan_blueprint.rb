# frozen_string_literal: true

class PlatformPlanBlueprint < Blueprinter::Base
  identifier :id

  fields :key, :name, :monthly_amount_cents, :created_at, :updated_at
end
