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

          payload = {
            code: issue_request.charge_id&.to_s,
            customer: customer_payload(issue_request.customer),
            services: [ service_payload(issue_request) ],
            payment_terms: payment_terms,
            payment_forms: %w[BANK_SLIP PIX]
          }

          payload.compact
        end

        def customer_payload(customer)
          data = {
            name: customer.name,
            email: customer.email,
            document: {
              identity: customer.document_number,
              type: "CPF"
            }
          }
          data[:telephone] = customer.phone if customer.phone.present?
          data[:address] = address_payload(customer.address) if customer.address
          data
        end
        private_class_method :customer_payload

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
