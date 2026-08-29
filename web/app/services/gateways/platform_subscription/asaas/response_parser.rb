# frozen_string_literal: true

module Gateways
  module PlatformSubscription
    module Asaas
      module ResponseParser
        module_function

        def billing_account(payload)
          ValueObjects::BillingAccount.new(
            name: payload["name"],
            email: payload["email"],
            document_number: payload["cpfCnpj"],
            external_id: payload.fetch("id")
          )
        end

        def subscription(payload, latest_payment: nil)
          payment = latest_payment.is_a?(Hash) ? latest_payment : nil
          ValueObjects::RemoteSubscription.new(
            external_subscription_id: payload.fetch("id"),
            external_customer_id: payload["customer"],
            status: subscription_status(payload, payment: payment),
            plan_identifier: payload["externalReference"],
            current_period_start: parse_time(payload["dateCreated"]),
            current_period_end: parse_time(payload["nextDueDate"]),
            trial_ends_at: trial_ends_at(payload, payment: payment),
            cancel_at_period_end: payload["status"] == "INACTIVE",
            canceled_at: payload["deleted"] == true ? Time.current : nil,
            latest_invoice_id: payment&.fetch("id", nil),
            latest_invoice_url: hosted_invoice_url(payment)
          )
        end

        def invoice(payload)
          ValueObjects::RemoteInvoice.new(
            external_invoice_id: payload.fetch("id"),
            external_subscription_id: payload["subscription"],
            status: invoice_status(payload["status"]),
            amount_cents: integer_cents(payload["value"]),
            due_at: parse_time(payload["dueDate"]),
            paid_at: parse_time(payload["paymentDate"] || payload["clientPaymentDate"]),
            hosted_invoice_url: hosted_invoice_url(payload),
            payment_method: payment_method(payload["billingType"])
          )
        end

        def checkout_session(subscription_payload, payment_payload)
          remote = subscription(subscription_payload, latest_payment: payment_payload)
          invoice_obj = payment_payload.present? ? invoice(payment_payload) : nil

          ValueObjects::CheckoutSession.new(
            checkout_url: invoice_obj&.hosted_invoice_url || remote.latest_invoice_url,
            billing_portal_url: nil,
            external_customer_id: remote.external_customer_id,
            external_subscription_id: remote.external_subscription_id,
            external_invoice_id: invoice_obj&.external_invoice_id,
            status: remote.status,
            invoice: invoice_obj
          )
        end

        def subscription_status(payload, payment: nil)
          return "canceled" if payload["deleted"] == true || payload["status"] == "EXPIRED"
          return "past_due" if payment&.dig("status") == "OVERDUE"
          return "trialing" if trialing?(payload, payment: payment)
          return "incomplete" if payment.present? && %w[PENDING OVERDUE].include?(payment["status"].to_s)

          case payload["status"].to_s
          when "INACTIVE" then "past_due"
          when "ACTIVE" then "active"
          else "active"
          end
        end

        def invoice_status(status)
          StatusNormalizer.from_asaas_invoice(status)
        end

        def integer_cents(value)
          return 0 if value.blank?

          (value.to_f * 100).round
        end

        def parse_time(value)
          return if value.blank?
          return value if value.is_a?(Time) || value.is_a?(ActiveSupport::TimeWithZone)

          Time.zone.parse(value.to_s)
        rescue ArgumentError
          nil
        end

        def payment_method(value)
          StatusNormalizer.from_asaas_payment_method(value)
        end

        def hosted_invoice_url(payload)
          return if payload.blank?

          payload["invoiceUrl"].presence || payload["bankSlipUrl"].presence || payload["transactionReceiptUrl"]
        end

        def trialing?(payload, payment: nil)
          due = parse_time(payload["nextDueDate"])
          return false if due.blank? || due <= Time.zone.now

          payment.blank? || payment["status"].to_s == "PENDING"
        end

        def trial_ends_at(payload, payment: nil)
          return unless trialing?(payload, payment: payment)

          parse_time(payload["nextDueDate"])
        end

        def payment_list(payload)
          payload.is_a?(Hash) ? Array(payload["data"]) : Array(payload)
        end
      end
    end
  end
end
