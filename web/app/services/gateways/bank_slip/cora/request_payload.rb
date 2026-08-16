# frozen_string_literal: true

module Gateways
  module BankSlip
    module Cora
      module RequestPayload
        module_function

        def from(issue_request)
          payment_terms = {
            due_date: issue_request.due_date.iso8601
          }
          if issue_request.interest_rate_percent.present?
            payment_terms[:interest] = {
              rate: issue_request.interest_rate_percent.to_f
            }
          end
          if issue_request.early_payment_discount_percent.present?
            payment_terms[:discount] = {
              type: "PERCENT",
              value: issue_request.early_payment_discount_percent.to_f
            }
          end
          fine = fine_payload(issue_request)
          payment_terms[:fine] = fine if fine

          payload = {
            code: issue_request.charge_id&.to_s,
            customer: customer_payload(issue_request.customer),
            services: [ service_payload(issue_request) ],
            payment_terms: payment_terms,
            payment_forms: %w[BANK_SLIP PIX],
            notification: notification_payload(issue_request.customer)
          }

          payload.compact
        end

        def fine_payload(issue_request)
          case issue_request.fine_type
          when "percent"
            return nil if issue_request.fine_rate_percent.blank?

            { rate: issue_request.fine_rate_percent.to_f }
          when "fixed"
            return nil if issue_request.fine_amount_cents.blank?

            { amount: issue_request.fine_amount_cents }
          end
        end
        private_class_method :fine_payload

        def customer_payload(customer)
          data = {
            name: customer.name,
            email: customer.email,
            document: {
              identity: customer.document_number,
              type: "CPF"
            }
          }
          data[:address] = address_payload(customer.address) if customer.address
          data
        end
        private_class_method :customer_payload

        # Cora carries the payer's contact details in `notification`, not on the customer: a
        # channel is an address to reach plus the rules saying when to use it. `rules` is not
        # optional — a channel without it is rejected with an empty 400, which says nothing.
        NOTIFICATION_RULES = %w[NOTIFY_TWO_DAYS_BEFORE_DUE_DATE NOTIFY_ON_DUE_DATE].freeze

        def notification_payload(customer)
          channels = []
          channels << { channel: "EMAIL", contact: customer.email, rules: NOTIFICATION_RULES } if customer.email.present?
          channels << { channel: "SMS", contact: customer.phone, rules: NOTIFICATION_RULES } if customer.phone.present?
          return if channels.empty?

          { name: customer.name, channels: channels }
        end
        private_class_method :notification_payload

        def address_payload(address)
          {
            street: address.street,
            number: address.number,
            district: address.neighborhood,
            city: address.city,
            state: address.state,
            complement: address.complement.presence || "N/A",
            zip_code: address.postal_code
          }
        end
        private_class_method :address_payload

        def service_payload(issue_request)
          description = issue_request.service_description.presence || I18n.t("billing.settings.default_service_description")
          {
            name: description,
            description: description,
            amount: issue_request.total_amount_cents
          }
        end
        private_class_method :service_payload
      end
    end
  end
end
