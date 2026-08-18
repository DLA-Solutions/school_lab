# frozen_string_literal: true

class PlatformSubscriptionBlueprint < Blueprinter::Base
  identifier :id

  fields :school_id, :platform_plan_id, :status, :trial_ends_at, :current_period_end,
         :created_at, :updated_at

  association :platform_plan, blueprint: PlatformPlanBlueprint
  association :school, blueprint: SchoolBlueprint, view: :summary
end
