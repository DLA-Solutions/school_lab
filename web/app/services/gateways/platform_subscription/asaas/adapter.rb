# frozen_string_literal: true

module Gateways
  module PlatformSubscription
    module Asaas
      class Adapter
        include Interface

        PROVIDER = "asaas"

        def initialize(client: nil)
          @client = client
        end

        def create_billing_account(account)
          with_port_errors do
            payload = client.create_customer(body: RequestPayload.customer(account))
            ResponseParser.billing_account(payload)
          end
        end

        def update_billing_account(external_customer_id:, account:)
          with_port_errors do
            payload = client.update_customer(
              id: external_customer_id,
              body: RequestPayload.customer(account)
            )
            ResponseParser.billing_account(payload)
          end
        end

        def create_checkout_session(request)
          with_port_errors do
            if request.existing_subscription_id.present?
              remote = fetch_subscription(external_subscription_id: request.existing_subscription_id)
              return ValueObjects::CheckoutSession.new(
                checkout_url: remote.latest_invoice_url,
                billing_portal_url: nil,
                external_customer_id: remote.external_customer_id,
                external_subscription_id: remote.external_subscription_id,
                external_invoice_id: remote.latest_invoice_id,
                status: remote.status
              )
            end

            customer_id = request.existing_customer_id.presence
            customer_id = create_billing_account(request.account).external_id if customer_id.blank?

            subscription_payload = client.create_subscription(
              body: RequestPayload.subscription(request, customer_id: customer_id)
            )
            payment_payload = latest_subscription_payment(subscription_payload.fetch("id"))
            ResponseParser.checkout_session(subscription_payload, payment_payload)
          end
        end

        def create_billing_portal_session(external_customer_id:)
          raise NotSupportedError.new("Asaas has no hosted billing portal", error_code: :portal_not_supported)
        end

        def create_subscription(request)
          session = create_checkout_session(
            ValueObjects::CheckoutSessionRequest.new(
              account: request.account,
              catalog_ref: request.catalog_ref,
              trial: request.trial,
              trial_days: request.trial_days,
              existing_customer_id: request.existing_customer_id
            )
          )
          fetch_subscription(external_subscription_id: session.external_subscription_id)
        end

        def fetch_subscription(external_subscription_id:)
          with_port_errors do
            subscription_payload = client.fetch_subscription(id: external_subscription_id)
            payment_payload = latest_subscription_payment(external_subscription_id)
            ResponseParser.subscription(subscription_payload, latest_payment: payment_payload)
          end
        end

        def change_plan(external_subscription_id:, catalog_ref:)
          with_port_errors do
            payload = client.update_subscription(
              id: external_subscription_id,
              body: RequestPayload.subscription_update(catalog_ref)
            )
            payment_payload = latest_subscription_payment(external_subscription_id)
            ResponseParser.subscription(payload, latest_payment: payment_payload)
          end
        end

        def cancel_subscription(external_subscription_id:, at_period_end:)
          with_port_errors do
            payload = if at_period_end
              client.update_subscription(
                id: external_subscription_id,
                body: RequestPayload.inactivate_subscription
              )
            else
              client.delete_subscription(id: external_subscription_id)
            end
            payment_payload = latest_subscription_payment(external_subscription_id) unless at_period_end
            remote = ResponseParser.subscription(payload, latest_payment: payment_payload)
            ValueObjects::RemoteSubscription.new(
              external_subscription_id: remote.external_subscription_id,
              external_customer_id: remote.external_customer_id,
              status: at_period_end ? remote.status : "canceled",
              plan_identifier: remote.plan_identifier,
              current_period_start: remote.current_period_start,
              current_period_end: remote.current_period_end,
              trial_ends_at: remote.trial_ends_at,
              cancel_at_period_end: at_period_end,
              canceled_at: at_period_end ? nil : Time.current,
              latest_invoice_id: remote.latest_invoice_id,
              latest_invoice_url: remote.latest_invoice_url
            )
          end
        end

        def fetch_invoice(external_invoice_id:)
          with_port_errors do
            ResponseParser.invoice(client.fetch_payment(id: external_invoice_id))
          end
        end

        def list_invoices(external_customer_id:, since: nil, limit: 100)
          with_port_errors do
            params = { customer: external_customer_id, limit: limit, offset: 0 }
            params[:dateCreatedGe] = since.strftime("%Y-%m-%d") if since.present?
            payload = client.list_payments(params: params)
            ResponseParser.payment_list(payload).map { |row| ResponseParser.invoice(row) }
          end
        end

        def capabilities
          Capabilities.new(
            hosted_checkout: true,
            hosted_billing_portal: false,
            credit_card: true,
            boleto: true,
            pix: true,
            trial_periods: true,
            proration_on_upgrade: false,
            proration_on_downgrade: false,
            cancel_at_period_end: true,
            immediate_cancel: true,
            plan_change_mid_cycle: true,
            native_webhooks: true
          )
        end

        private

        def client
          @client ||= SchoolLab::Integrations::Asaas::Client.new
        end

        def latest_subscription_payment(subscription_id)
          payload = client.list_subscription_payments(id: subscription_id, params: { limit: 1 })
          ResponseParser.payment_list(payload).first
        end

        def with_port_errors
          yield
        rescue SchoolLab::Integrations::Asaas::Error, SchoolLab::Http::ConnectionError => error
          ErrorMapper.map(error)
        end
      end
    end
  end
end
