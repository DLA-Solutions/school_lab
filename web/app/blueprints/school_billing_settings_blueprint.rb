# frozen_string_literal: true

class SchoolBillingSettingsBlueprint < Blueprinter::Base
  identifier :school_id

  fields :overdue_grace_days, :service_description, :notification_schedule, :fine_type

  field :interest_rate_percent do |settings|
    settings.interest_rate_percent&.to_f
  end

  field :early_payment_discount_percent do |settings|
    settings.early_payment_discount_percent&.to_f
  end

  field :fine_rate_percent do |settings|
    settings.fine_rate_percent&.to_f
  end

  field :fine_amount_cents do |settings|
    settings.fine_amount_cents
  end

  field :persisted do |settings|
    settings.persisted
  end
end
