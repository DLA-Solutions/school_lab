# frozen_string_literal: true

class GuardianBlueprint < Blueprinter::Base
  identifier :id

  # `cpf` is the canonical 11 digits; clients format it for display.
  fields :school_id, :user_id, :name, :cpf, :email, :phone

  fields(*Guardian::ADDRESS_FIELDS)
end
