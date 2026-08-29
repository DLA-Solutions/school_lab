# frozen_string_literal: true

module Gateways
  module PlatformSubscription
    module ValueObjects
      CatalogRef = Data.define(:plan_key, :billing_interval, :external_price_id, :amount_cents) do
        def initialize(plan_key:, billing_interval:, external_price_id: nil, amount_cents: nil)
          interval = billing_interval.to_s
          raise ArgumentError, "invalid billing_interval: #{interval}" unless %w[month year].include?(interval)

          super(
            plan_key: plan_key.to_s,
            billing_interval: interval,
            external_price_id: external_price_id,
            amount_cents: amount_cents
          )
        end
      end

      BillingAccount = Data.define(:name, :email, :document_number, :external_id) do
        def initialize(name: nil, email: nil, document_number: nil, external_id: nil, legal_name: nil, tax_id: nil)
          super(
            name: name.presence || legal_name,
            email: email,
            document_number: document_number.presence || tax_id,
            external_id: external_id
          )
        end

        def legal_name
          name
        end

        def tax_id
          document_number
        end
      end

      CheckoutSessionRequest = Data.define(
        :account,
        :catalog_ref,
        :trial,
        :trial_days,
        :existing_customer_id,
        :idempotency_key,
        :existing_subscription_id
      ) do
        def initialize(account:, catalog_ref:, trial: false, trial_days: 14, existing_customer_id: nil,
                       idempotency_key: nil, school_id: nil, external_price_id: nil, external_customer_id: nil,
                       existing_subscription_id: nil)
          super(
            account: account,
            catalog_ref: catalog_ref,
            trial: trial,
            trial_days: trial_days,
            existing_customer_id: existing_customer_id.presence || external_customer_id,
            idempotency_key: idempotency_key,
            existing_subscription_id: existing_subscription_id
          )
        end

        def external_customer_id
          existing_customer_id
        end

        def external_price_id
          catalog_ref.external_price_id
        end
      end

      CheckoutRequest = CheckoutSessionRequest

      CheckoutSession = Data.define(
        :checkout_url,
        :billing_portal_url,
        :external_customer_id,
        :external_subscription_id,
        :external_invoice_id,
        :status,
        :invoice
      ) do
        def initialize(checkout_url:, billing_portal_url: nil, external_customer_id: nil,
                       external_subscription_id: nil, external_invoice_id: nil, status: nil, invoice: nil,
                       external_session_id: nil)
          super(
            checkout_url: checkout_url,
            billing_portal_url: billing_portal_url,
            external_customer_id: external_customer_id,
            external_subscription_id: external_subscription_id,
            external_invoice_id: external_invoice_id.presence || invoice&.external_invoice_id,
            status: status,
            invoice: invoice
          )
        end
      end

      SubscriptionRequest = Data.define(
        :account,
        :catalog_ref,
        :trial,
        :trial_days,
        :existing_customer_id
      ) do
        def initialize(account:, catalog_ref:, trial: false, trial_days: 14, existing_customer_id: nil)
          super
        end
      end

      RemoteSubscription = Data.define(
        :external_subscription_id,
        :external_customer_id,
        :status,
        :plan_identifier,
        :current_period_start,
        :current_period_end,
        :trial_ends_at,
        :cancel_at_period_end,
        :canceled_at,
        :latest_invoice_id,
        :latest_invoice_url
      ) do
        def initialize(external_subscription_id: nil, external_customer_id: nil, status:, plan_identifier: nil,
                       current_period_start: nil, current_period_end: nil, trial_ends_at: nil,
                       cancel_at_period_end: false, canceled_at: nil, latest_invoice_id: nil,
                       latest_invoice_url: nil, external_id: nil)
          super(
            external_subscription_id: external_subscription_id.presence || external_id,
            external_customer_id: external_customer_id,
            status: StatusNormalizer.subscription(status),
            plan_identifier: plan_identifier,
            current_period_start: current_period_start,
            current_period_end: current_period_end,
            trial_ends_at: trial_ends_at,
            cancel_at_period_end: cancel_at_period_end,
            canceled_at: canceled_at,
            latest_invoice_id: latest_invoice_id,
            latest_invoice_url: latest_invoice_url
          )
        end

        def external_id
          external_subscription_id
        end
      end

      RemoteInvoice = Data.define(
        :external_invoice_id,
        :external_subscription_id,
        :status,
        :amount_cents,
        :due_at,
        :paid_at,
        :hosted_invoice_url,
        :payment_method
      ) do
        def initialize(external_invoice_id: nil, external_subscription_id: nil, status:, amount_cents: 0,
                       due_at: nil, paid_at: nil, hosted_invoice_url: nil, payment_method: nil,
                       external_id: nil, hosted_url: nil)
          super(
            external_invoice_id: external_invoice_id.presence || external_id,
            external_subscription_id: external_subscription_id,
            status: StatusNormalizer.invoice(status),
            amount_cents: amount_cents.to_i,
            due_at: due_at,
            paid_at: paid_at,
            hosted_invoice_url: hosted_invoice_url.presence || hosted_url,
            payment_method: payment_method
          )
        end

        def external_id
          external_invoice_id
        end

        def hosted_url
          hosted_invoice_url
        end
      end

      DomainEvent = Data.define(
        :provider,
        :provider_event_id,
        :event_type,
        :external_subscription_id,
        :external_invoice_id,
        :external_customer_id,
        :payload
      ) do
        def initialize(provider:, provider_event_id:, event_type:, external_subscription_id: nil,
                       external_invoice_id: nil, external_customer_id: nil, payload: nil)
          super
        end
      end
    end
  end
end
