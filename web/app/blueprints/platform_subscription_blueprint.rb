# frozen_string_literal: true

class PlatformSubscriptionBlueprint < Blueprinter::Base
  identifier :id

  class << self
    def amount_for(subscription)
      price = PlatformPlanProviderPrice.active.find_by(
        platform_plan_id: subscription.platform_plan_id,
        provider: subscription.provider,
        billing_interval: subscription.billing_interval
      )
      price&.amount_cents || subscription.platform_plan.monthly_amount_cents
    end
  end

  fields :school_id, :platform_plan_id, :status, :trial_ends_at, :current_period_end,
         :created_at, :updated_at, :billing_interval, :provider, :collection_method,
         :current_period_start, :cancel_at_period_end, :canceled_at

  association :platform_plan, blueprint: PlatformPlanBlueprint
  association :school, blueprint: SchoolBlueprint, view: :summary

  view :backoffice do
    fields :external_customer_id, :external_subscription_id
  end

  view :school do
    exclude :school_id
    exclude :provider
    exclude :school

    field :plan_key do |subscription|
      subscription.platform_plan.key
    end

    field :plan_name do |subscription|
      subscription.platform_plan.name
    end

    field :amount_cents do |subscription|
      amount_for(subscription)
    end

    field :billing_portal_url do |_subscription|
      nil
    end

    field :open_invoice do |subscription|
      invoice = subscription.platform_invoices.open_status.order(due_at: :desc).first
      next nil unless invoice

      PlatformInvoiceBlueprint.render_as_hash(invoice)
    end
  end
end
