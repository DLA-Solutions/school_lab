# frozen_string_literal: true

class SchoolBlueprint < Blueprinter::Base
  identifier :id

  fields :name, :cnpj, :address, :saas_plan, :school_group_id,
         :onboarding_status, :onboarding_mode, :billing_waived_at, :segments_skipped_at,
         :signature_email

  # Whether the school is itself a party to the contracts it sends, which needs both the address
  # and a valid CNPJ — so the screen can say why signing is off without re-deriving the rule.
  field :signs_contracts do |school|
    school.signs_contracts?
  end
end
