# frozen_string_literal: true

class SchoolPlatformSubscriptionBlueprint < Blueprinter::Base
  identifier :id

  fields :status, :billing_interval, :trial_ends_at, :current_period_start, :current_period_end,
         :cancel_at_period_end, :collection_method

  field :plan_key do |subscription|
    subscription.platform_plan&.key
  end

  field :plan_name do |subscription|
    subscription.platform_plan&.name
  end

  field :amount_cents do |subscription|
    PlatformSubscriptionBlueprint.amount_for(subscription)
  end

  field :billing_portal_url do |_subscription|
    nil
  end

  field :open_invoice do |subscription|
    invoice = subscription.platform_invoices.open_status.order(due_at: :desc).first
    next unless invoice

    PlatformInvoiceBlueprint.render_as_hash(invoice)
  end
end
