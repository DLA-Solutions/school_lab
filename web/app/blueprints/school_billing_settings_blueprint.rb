# frozen_string_literal: true

class SchoolBillingSettingsBlueprint < Blueprinter::Base
  identifier :school_id

  fields :overdue_grace_days, :service_description, :notification_schedule

  field :interest_rate_percent do |settings|
    settings.interest_rate_percent&.to_f
  end

  field :persisted do |settings|
    settings.persisted
  end
end
