# frozen_string_literal: true

class SchoolBillingSettingsBlueprint < Blueprinter::Base
  identifier :school_id

  fields :overdue_grace_days, :service_description, :notification_schedule, :interest_rate_percent

  field :persisted do |settings|
    settings.persisted
  end
end
