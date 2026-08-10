# frozen_string_literal: true

class SchoolBlueprint < Blueprinter::Base
  identifier :id

  fields :name, :cnpj, :address, :saas_plan, :school_group_id,
         :onboarding_status, :onboarding_mode, :billing_waived_at, :segments_skipped_at
end
