# frozen_string_literal: true

class PlatformImpersonationSessionBlueprint < Blueprinter::Base
  identifier :id

  fields :operator_user_id, :target_user_id, :school_id, :target_membership_id,
         :expires_at, :ended_at, :created_at

  field :operator_email do |session|
    session.operator_user.email
  end

  field :school_name do |session|
    session.school.name
  end

  field :active do |session|
    session.active?
  end
end
