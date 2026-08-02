# frozen_string_literal: true

module Gateways
  module BankSlip
    module Cora
      module ResponseParser
        STATUS_MAPPING = {
          "DRAFT" => "draft",
          "OPEN" => "open",
          "PAID" => "paid",
          "LATE" => "late",
          "CANCELLED" => "cancelled"
        }.freeze

        module_function

        def parse_issuance(payload)
          bank_slip = extract_bank_slip(payload)
          pix = payload["pix"] || {}

          ValueObjects::Issuance.new(
            provider_invoice_id: payload.fetch("id"),
            boleto_url: bank_slip.fetch("url"),
            digitable_line: bank_slip.fetch("digitable"),
            barcode: bank_slip.fetch("barcode"),
            our_number: bank_slip.fetch("our_number"),
            pix_emv: pix["emv"],
            status: normalize_status(payload.fetch("status")),
            amount_cents: coerce_amount_cents(payload.fetch("total_amount"))
          )
        end

        def parse_invoice(payload)
          payments = Array(payload["payments"]).map { |payment| parse_payment(payment) }

          ValueObjects::RemoteInvoice.new(
            provider_invoice_id: payload.fetch("id"),
            status: normalize_status(payload.fetch("status")),
            total_amount_cents: coerce_amount_cents(payload.fetch("total_amount")),
            due_date: parse_due_date(payload),
            payments: payments
          )
        end

        def parse_payment(payment)
          ValueObjects::RemotePayment.new(
            provider_payment_id: payment.fetch("id"),
            paid_amount_cents: coerce_amount_cents(payment.fetch("amount")),
            paid_at: Time.zone.parse(payment.fetch("occurrence_date")),
            payment_method: normalize_payment_method(payment.fetch("method")),
            fine_amount_cents: coerce_optional_amount_cents(payment["fine"]),
            interest_amount_cents: coerce_optional_amount_cents(payment["interest"])
          )
        end

        def normalize_status(provider_status)
          StatusNormalizer.normalize(provider_status, mapping: STATUS_MAPPING)
        end

        def normalize_payment_method(method)
          case method.to_s.upcase
          when "PIX" then "pix"
          when "BANK_SLIP", "BOLETO" then "boleto"
          else method.to_s.downcase
          end
        end

        def extract_bank_slip(payload)
          payload.dig("payment_options", "bank_slip") || payload.fetch("bank_slip")
        end

        def parse_due_date(payload)
          due_date = payload.dig("payment_terms", "due_date") || payload.dig("paymentTerms", "due_date")
          Date.iso8601(due_date)
        end

        def coerce_amount_cents(value)
          Integer(value)
        rescue ArgumentError, TypeError
          raise ProviderError, "Invalid amount from provider"
        end

        def coerce_optional_amount_cents(value)
          return 0 if value.nil?

          coerce_amount_cents(value)
        end
      end
    end
  end
end
