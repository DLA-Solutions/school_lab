# frozen_string_literal: true

class MembershipBlueprint < Blueprinter::Base
  identifier :id

  fields :school_id, :role, :status

  field :email do |membership|
    membership.user&.email
  end

  field :school_name do |membership|
    membership.school&.name
  end
end
