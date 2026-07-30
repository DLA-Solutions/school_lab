# frozen_string_literal: true

class GuardianBlueprint < Blueprinter::Base
  identifier :id

  fields :school_id, :user_id, :name, :cpf, :email, :phone
end
