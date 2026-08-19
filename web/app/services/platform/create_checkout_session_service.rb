# frozen_string_literal: true

module Platform
  class CreateCheckoutSessionService < ApplicationService
    CHECKOUTABLE_STATUSES = %w[incomplete canceled].freeze
    TRIAL_DAYS = 14

    def initialize(school:, params:, subscription: nil, gateway: nil, allow_existing: false, actor: nil, adapter: nil)
      @school = school
      @params = params.to_h.symbolize_keys
      @subscription = subscription
      @gateway = gateway || adapter
      @allow_existing = allow_existing
      @actor = actor
    end

    def call
      validation = validate_school!
      return validation if validation.failure?

      plan = resolve_plan
      return ResponseService.failure(code: :not_found) unless plan

      interval = params[:billing_interval].presence || subscription&.billing_interval || "month"
      unless PlatformSubscription::INTERVALS.include?(interval)
        return ResponseService.failure(
          code: :validation_error,
          details: { billing_interval: [ "must be month or year" ] }
        )
      end

      provider = subscription&.provider.presence || Gateways::PlatformSubscription::Registry.active_provider
      gateway = @gateway || Gateways::PlatformSubscription::Registry.for(provider)

      unless gateway.capabilities.hosted_checkout
        return ResponseService.failure(code: :not_implemented)
      end

      record = find_or_build_subscription(plan: plan, interval: interval, provider: provider)
      return record if record.is_a?(ResponseService)

      price = resolve_price(plan: plan, provider: provider, interval: interval)
      return ResponseService.failure(code: :not_found) unless price

      trial = ActiveModel::Type::Boolean.new.cast(params.fetch(:trial, false))
      catalog_ref = Gateways::PlatformSubscription::ValueObjects::CatalogRef.new(
        plan_key: plan.key,
        billing_interval: interval,
        external_price_id: price.external_price_id,
        amount_cents: price.amount_cents
      )
      request = Gateways::PlatformSubscription::ValueObjects::CheckoutSessionRequest.new(
        account: BillingAccountBuilder.from_school(school),
        catalog_ref: catalog_ref,
        trial: trial,
        trial_days: TRIAL_DAYS,
        existing_customer_id: record.external_customer_id,
        existing_subscription_id: record.external_subscription_id
      )

      session = gateway.create_checkout_session(request)
      persist_checkout!(record, plan: plan, interval: interval, session: session, trial: trial)
      SyncInvoiceService.call(subscription: record.reload, remote_invoice: session.invoice) if session.invoice

      ResponseService.success(data: { session: session, subscription: record.reload })
    rescue Gateways::PlatformSubscription::NotSupportedError => e
      ResponseService.failure(code: e.error_code)
    rescue Gateways::PlatformSubscription::ValidationError => e
      ResponseService.failure(code: :validation_error, details: e.details)
    rescue Gateways::PlatformSubscription::Error => e
      ResponseService.failure(code: :provider_error, details: { message: e.message })
    end

    private

    attr_reader :school, :params, :subscription, :allow_existing

    def validate_school!
      if school.cnpj.blank?
        return ResponseService.failure(
          code: :validation_error,
          details: { cnpj: [ "is required for checkout" ] }
        )
      end

      if BillingAccountBuilder.billing_email(school).blank?
        return ResponseService.failure(
          code: :validation_error,
          details: { email: [ "billing email is required for checkout" ] }
        )
      end

      ResponseService.success(data: nil)
    end

    def resolve_plan
      if params[:platform_plan_id].present?
        return PlatformPlan.kept.find_by(id: params[:platform_plan_id])
      end
      if params[:plan_key].present?
        return PlatformPlan.kept.find_by(key: params[:plan_key])
      end

      subscription&.platform_plan
    end

    def resolve_price(plan:, provider:, interval:)
      PlatformPlanProviderPrice.active.find_by(
        platform_plan: plan,
        provider: provider,
        billing_interval: interval
      )
    end

    def find_or_build_subscription(plan:, interval:, provider:)
      record = subscription || school.platform_subscription
      if record.present?
        if ActiveModel::Type::Boolean.new.cast(params[:school_scoped]) && record.manual? && record.status != "canceled"
          return ResponseService.failure(code: :invalid_state_transition)
        end
        unless allow_existing || CHECKOUTABLE_STATUSES.include?(record.status)
          return ResponseService.failure(code: :subscription_exists)
        end

        return record
      end

      PlatformSubscription.create!(
        school: school,
        platform_plan: plan,
        status: "incomplete",
        provider: provider,
        billing_interval: interval,
        collection_method: "send_invoice"
      )
    end

    def persist_checkout!(record, plan:, interval:, session:, trial:)
      attrs = {
        platform_plan: plan,
        billing_interval: interval,
        external_customer_id: session.external_customer_id,
        external_subscription_id: session.external_subscription_id,
        status: session.status.presence || (trial ? "trialing" : "incomplete"),
        collection_method: "send_invoice"
      }
      attrs[:trial_ends_at] = TRIAL_DAYS.days.from_now if trial
      record.update!(attrs)
    end
  end
end
