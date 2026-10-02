# frozen_string_literal: true

module Notifications
  # BR-N04 delivery pipeline: sends one push per active device token for a single
  # (intent, channel, user) delivery. Enqueued by `Notifications::ProcessIntentService` only when
  # the school's push policy is on — a delivery this job never touches was skipped synchronously.
  class SendPushNotificationJob < ApplicationJob
    queue_as :default

    discard_on ActiveRecord::RecordNotFound
    # `:exponentially_longer` is not a real ActiveJob wait preset on this Rails version (only
    # `:polynomially_longer` is) — mirrors `Billing::IssueChargeJob`'s retry_on.
    retry_on Gateways::Push::TransientError, wait: :polynomially_longer, attempts: 5

    def perform(delivery_id, school_id)
      school = School.kept.find(school_id)
      delivery = school.notification_deliveries.find(delivery_id)

      # Idempotent no-op: `sent`/`failed`/`skipped` are terminal (BR-N05). This guards both a
      # duplicate manual re-enqueue and a retry racing an earlier attempt that already resolved
      # the delivery — `retry_on` above only covers the `TransientError` raised mid-attempt.
      return unless delivery.queued?

      tokens = delivery.user.device_tokens.kept.to_a
      if tokens.empty?
        delivery.error_code = "no_active_device_token"
        delivery.fail!
        return
      end

      resolve_delivery(delivery, deliver_to_tokens(delivery, tokens))
    end

    private

    def deliver_to_tokens(delivery, tokens)
      gateway = Gateways::Push::Registry.current
      title, body, data = push_content(delivery)

      delivered = false
      tokens.each do |device_token|
        delivered = true if deliver_to_token(gateway, device_token, title: title, body: body, data: data)
      end
      delivered
    end

    # BR-N09: an unregistered token is discarded on its own — it must not abort delivery to the
    # user's other device tokens, so only this error is rescued per-token.
    def deliver_to_token(gateway, device_token, title:, body:, data:)
      gateway.deliver(token: device_token.token, title: title, body: body, data: data)
      true
    rescue Gateways::Push::InvalidTokenError
      device_token.discard!
      false
    end

    def push_content(delivery)
      payload = delivery.notification_intent.payload || {}
      [ payload["title"], payload["body"], payload.except("title", "body") ]
    end

    def resolve_delivery(delivery, delivered)
      if delivered
        delivery.deliver!
      else
        delivery.error_code = "delivery_failed"
        delivery.fail!
      end
    end
  end
end
