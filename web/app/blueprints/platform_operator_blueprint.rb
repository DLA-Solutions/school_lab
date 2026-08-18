# frozen_string_literal: true

class PlatformOperatorBlueprint < Blueprinter::Base
  identifier :id

  fields :email, :status

  field :platform_permissions do |user|
    user.backoffice_membership&.platform_permissions || []
  end
end
