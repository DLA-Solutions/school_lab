# frozen_string_literal: true

module Gateways
  module PlatformSubscription
    module Asaas
      module RequestPayload
        module_function

        def customer(account)
          {
            name: account.legal_name,
            email: account.email,
            cpfCnpj: account.tax_id.to_s.gsub(/\D/, "")
          }.compact
        end

        def customer_from(account)
          customer(account)
        end

        def subscription(request, customer_id:)
          payload = {
            customer: customer_id,
            billingType: "UNDEFINED",
            value: decimal_amount(request.catalog_ref.amount_cents),
            cycle: cycle_for(request.catalog_ref.billing_interval),
            externalReference: request.catalog_ref.external_price_id,
            description: "#{request.catalog_ref.plan_key} (#{request.catalog_ref.billing_interval})"
          }
          payload[:nextDueDate] = next_due_date(request)
          payload
        end

        def subscription_update(catalog_ref)
          {
            value: decimal_amount(catalog_ref.amount_cents),
            cycle: cycle_for(catalog_ref.billing_interval),
            externalReference: catalog_ref.external_price_id,
            updatePendingPayments: true
          }
        end

        def inactivate_subscription
          { status: "INACTIVE" }
        end

        def decimal_amount(amount_cents)
          (amount_cents.to_i / 100.0).round(2)
        end

        def cycle_for(interval)
          interval.to_s == "year" ? "YEARLY" : "MONTHLY"
        end

        def next_due_date(request)
          date = if request.trial && request.trial_days.to_i.positive?
            request.trial_days.to_i.days.from_now
          else
            Time.zone.today
          end
          date.strftime("%Y-%m-%d")
        end
      end
    end
  end
end
