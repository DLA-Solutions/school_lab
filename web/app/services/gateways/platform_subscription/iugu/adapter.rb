# frozen_string_literal: true

module Gateways
  module PlatformSubscription
    module Iugu
      class Adapter
        include Interface

        PROVIDER = "iugu"

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

            payload = client.create_subscription(
              body: RequestPayload.subscription_from(request, customer_id: customer_id)
            )
            ResponseParser.checkout_session(payload)
          end
        end

        def create_billing_portal_session(external_customer_id:)
          raise NotSupportedError.new("Iugu has no hosted billing portal", error_code: :portal_not_supported)
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
            ResponseParser.subscription(client.fetch_subscription(id: external_subscription_id))
          end
        end

        def change_plan(external_subscription_id:, catalog_ref:)
          with_port_errors do
            payload = client.change_plan(
              id: external_subscription_id,
              plan_identifier: catalog_ref.external_price_id
            )
            ResponseParser.subscription(payload)
          end
        end

        def cancel_subscription(external_subscription_id:, at_period_end:)
          with_port_errors do
            payload = if at_period_end
              client.suspend_subscription(id: external_subscription_id)
            else
              client.expire_subscription(id: external_subscription_id)
            end
            remote = ResponseParser.subscription(payload)
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
            ResponseParser.invoice(client.fetch_invoice(id: external_invoice_id))
          end
        end

        def list_invoices(external_customer_id:, since: nil, limit: 100)
          with_port_errors do
            params = { customer_id: external_customer_id, limit: limit }
            params[:created_at_from] = since.iso8601 if since.present?
            payload = client.list_invoices(params: params)
            items = payload.is_a?(Hash) ? Array(payload["items"]) : Array(payload)
            items.map { |row| ResponseParser.invoice(row) }
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
            proration_on_upgrade: true,
            proration_on_downgrade: true,
            cancel_at_period_end: true,
            immediate_cancel: true,
            plan_change_mid_cycle: true,
            native_webhooks: true
          )
        end

        private

        def client
          @client ||= SchoolLab::Integrations::Iugu::Client.new
        end

        def with_port_errors
          yield
        rescue SchoolLab::Integrations::Iugu::Error, SchoolLab::Http::ConnectionError => error
          ErrorMapper.map(error)
        end
      end
    end
  end
end
