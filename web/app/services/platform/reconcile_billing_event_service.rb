# frozen_string_literal: true

module Platform
  class ReconcileBillingEventService < ApplicationService
    def initialize(webhook_event:, gateway: nil, adapter: nil)
      @webhook_event = webhook_event
      @gateway = gateway || adapter
    end

    def call
      return ResponseService.success(data: webhook_event) if webhook_event.processed_at.present?

      subscription = find_subscription
      unless subscription
        webhook_event.update!(
          processing_error: "subscription_not_found",
          processed_at: Time.current
        )
        return ResponseService.success(data: :unmatched)
      end

      webhook_event.update!(school: subscription.school) if webhook_event.school_id.blank?

      sync_remote_subscription(subscription)
      sync_remote_invoice(subscription) if invoice_id.present?

      webhook_event.update!(processed_at: Time.current, processing_error: nil)
      ResponseService.success(data: webhook_event.reload)
    rescue Gateways::PlatformSubscription::TransientError
      raise
    rescue Gateways::PlatformSubscription::Error => e
      webhook_event.update!(processing_error: e.class.name)
      ResponseService.failure(code: :provider_error)
    end

    private

    attr_reader :webhook_event

    def gateway
      @gateway ||= Gateways::PlatformSubscription::Registry.for(webhook_event.provider)
    end

    def find_subscription
      payload = parsed_payload
      data = payload_data(payload)
      external_sub_id = [
        webhook_event.provider_resource_id,
        payload["external_subscription_id"],
        payload["subscription_id"],
        data["subscription_id"]
      ].find(&:present?)

      if external_sub_id.present?
        found = PlatformSubscription.find_by(
          provider: webhook_event.provider,
          external_subscription_id: external_sub_id
        )
        return found if found
      end

      return if invoice_id.blank?

      PlatformInvoice.find_by(
        provider: webhook_event.provider,
        external_invoice_id: invoice_id
      )&.platform_subscription
    end

    def sync_remote_subscription(subscription)
      return if subscription.external_subscription_id.blank?

      remote = gateway.fetch_subscription(external_subscription_id: subscription.external_subscription_id)
      SyncSubscriptionService.call(subscription: subscription, remote: remote)
    end

    def sync_remote_invoice(subscription)
      remote_invoice = gateway.fetch_invoice(external_invoice_id: invoice_id)
      SyncInvoiceService.call(subscription: subscription, remote_invoice: remote_invoice)
    rescue Gateways::PlatformSubscription::ProviderError
      nil
    end

    def invoice_id
      return unless webhook_event.event_type.to_s.start_with?("billing.invoice")

      payload = parsed_payload
      data = payload_data(payload)
      [
        payload["external_invoice_id"],
        payload["invoice_id"],
        payload["id"],
        data["id"],
        data["invoice_id"]
      ].find(&:present?)
    end

    def parsed_payload
      raw = webhook_event.payload
      return {} if raw.blank?
      return raw if raw.is_a?(Hash)
      return raw.to_unsafe_h if raw.respond_to?(:to_unsafe_h)

      JSON.parse(raw)
    rescue JSON::ParserError
      {}
    end

    def payload_data(payload)
      data = payload["data"]
      return data if data.is_a?(Hash)
      return data.to_unsafe_h if data.respond_to?(:to_unsafe_h)

      {}
    end
  end
end
