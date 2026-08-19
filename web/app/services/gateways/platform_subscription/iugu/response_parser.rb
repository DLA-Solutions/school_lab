# frozen_string_literal: true

module Gateways
  module PlatformSubscription
    module Iugu
      module ResponseParser
        module_function

        def remote_subscription(payload)
          subscription(payload)
        end

        def remote_invoice(payload)
          invoice(payload)
        end

        def billing_account(payload)
          ValueObjects::BillingAccount.new(
            name: payload["name"],
            email: payload["email"],
            document_number: payload["cpf_cnpj"],
            external_id: payload.fetch("id")
          )
        end

        def subscription(payload)
          latest = latest_invoice(payload)
          ValueObjects::RemoteSubscription.new(
            external_subscription_id: payload.fetch("id"),
            external_customer_id: payload["customer_id"],
            status: subscription_status(payload),
            plan_identifier: payload["plan_identifier"],
            current_period_start: parse_time(payload["cycled_at"]) || parse_time(payload["created_at"]),
            current_period_end: parse_time(payload["expires_at"]),
            trial_ends_at: parse_time(payload["trial_expires_at"]),
            cancel_at_period_end: payload["suspended"] == true,
            canceled_at: payload["expired_at"].present? ? parse_time(payload["expired_at"]) : nil,
            latest_invoice_id: latest&.fetch("id", nil),
            latest_invoice_url: latest&.fetch("secure_url", nil)
          )
        end

        def invoice(payload)
          ValueObjects::RemoteInvoice.new(
            external_invoice_id: payload.fetch("id"),
            external_subscription_id: payload["subscription_id"],
            status: payload["status"],
            amount_cents: integer_cents(payload["total_cents"] || payload["value_cents"] || payload["cents"]),
            due_at: parse_time(payload["due_date"]),
            paid_at: parse_time(payload["paid_at"]),
            hosted_invoice_url: payload["secure_url"],
            payment_method: payment_method(payload["payment_method"])
          )
        end

        def checkout_session(subscription_payload)
          remote = subscription(subscription_payload)
          latest = latest_invoice(subscription_payload)
          invoice = latest.is_a?(Hash) ? invoice(latest.merge("subscription_id" => subscription_payload["id"])) : nil

          ValueObjects::CheckoutSession.new(
            checkout_url: invoice&.hosted_invoice_url || remote.latest_invoice_url,
            billing_portal_url: nil,
            external_customer_id: remote.external_customer_id,
            external_subscription_id: remote.external_subscription_id,
            external_invoice_id: invoice&.external_invoice_id,
            status: remote.status,
            invoice: invoice
          )
        end

        def subscription_status(payload)
          return "canceled" if payload["expired_at"].present?
          return "past_due" if payload["suspended"]
          return "trialing" if payload["in_trial"]

          payload["status"].presence || "active"
        end

        def integer_cents(value)
          return 0 if value.blank?

          value.to_i
        end

        def parse_time(value)
          return if value.blank?
          return value if value.is_a?(Time) || value.is_a?(ActiveSupport::TimeWithZone)

          Time.zone.parse(value.to_s)
        rescue ArgumentError
          nil
        end

        def payment_method(value)
          {
            "iugu_credit_card" => "credit_card",
            "credit_card" => "credit_card",
            "iugu_bank_slip" => "bank_slip",
            "bank_slip" => "bank_slip",
            "boleto" => "bank_slip",
            "iugu_pix" => "pix",
            "pix" => "pix"
          }[value.to_s]
        end

        def latest_invoice(payload)
          invoices = Array(payload["recent_invoices"])
          invoices.find { |row| row.is_a?(Hash) }
        end
        private_class_method :latest_invoice
      end
    end
  end
end
