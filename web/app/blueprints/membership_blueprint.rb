# frozen_string_literal: true

class MembershipBlueprint < Blueprinter::Base
  identifier :id

  fields :school_id, :role, :status

  field :school_name do |membership|
    membership.school&.name
  end
end
