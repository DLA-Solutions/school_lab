# frozen_string_literal: true

module Gateways
  module PlatformSubscription
    module Iugu
      module RequestPayload
        module_function

        def customer(account)
          {
            email: account.email,
            name: account.legal_name,
            cpf_cnpj: account.tax_id.to_s.gsub(/\D/, "")
          }.compact
        end

        def customer_from(account)
          customer(account)
        end

        def subscription(request)
          payload = {
            customer_id: request.existing_customer_id,
            plan_identifier: request.catalog_ref.external_price_id,
            payable_with: %w[credit_card bank_slip pix]
          }
          payload[:expires_in] = request.trial_days if request.trial && request.trial_days.to_i.positive?
          payload
        end

        def subscription_from(request, customer_id: nil)
          payload = subscription(request)
          payload[:customer_id] = customer_id if customer_id.present?
          payload
        end

        def expires_at_param(time)
          time.respond_to?(:iso8601) ? time.iso8601 : time.to_s
        end
      end
    end
  end
end
