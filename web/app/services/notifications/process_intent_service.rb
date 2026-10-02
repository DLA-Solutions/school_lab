# frozen_string_literal: true

module Notifications
  # UC-N01 — fans a domain event out into per-user delivery rows and either enqueues a push job
  # or skips the delivery synchronously, per the school's effective policy (BR-N02, BR-N03,
  # BR-N04). Idempotent on retry (BR-N05, AC-N03): a second call with the same
  # `source_type`/`source_id`/`channel_key` is a no-op.
  class ProcessIntentService < ApplicationService
    def initialize(school:, channel_key:, source_type:, source_id:, target_user_ids:, payload: {})
      @school = school
      @channel_key = channel_key
      @source_type = source_type
      @source_id = source_id
      @target_user_ids = target_user_ids
      @payload = payload
    end

    def call
      existing = find_existing_intent
      return ResponseService.success(data: { intent_id: existing.id, delivery_ids: [] }) if existing

      intent, deliveries = create_intent_and_deliveries!
      dispatch!(deliveries)

      ResponseService.success(data: { intent_id: intent.id, delivery_ids: deliveries.map(&:id) })
    end

    private

    attr_reader :school, :channel_key, :source_type, :source_id, :target_user_ids, :payload

    # The per-delivery unique index (`[notification_intent_id, channel, user_id]`) is a second
    # safety net, not the primary idempotency mechanism — this lookup on the intent's own unique
    # key (`[source_type, source_id, channel_key]`) is what stops a retried event from fanning
    # out a second time at all.
    def find_existing_intent
      NotificationIntent.find_by(
        school: school, source_type: source_type, source_id: source_id, channel_key: channel_key
      )
    end

    def create_intent_and_deliveries!
      intent = nil
      deliveries = []

      ActiveRecord::Base.transaction do
        intent = NotificationIntent.create!(
          school: school,
          channel_key: channel_key,
          source_type: source_type,
          source_id: source_id,
          payload: payload
        )

        # Deliberate simplification for this slice: only the `push` adapter is wired up
        # (email/whatsapp are out of scope — see PRD BC4), so only `push` delivery rows are
        # created here. Creating email/whatsapp rows with no adapter to ever resolve them would
        # be dead data stuck in `queued` forever.
        target_user_ids.uniq.each do |user_id|
          deliveries << intent.notification_deliveries.create!(school: school, user_id: user_id, channel: "push")
        end
      end

      [ intent, deliveries ]
    end

    def dispatch!(deliveries)
      policy = NotificationPolicy.effective_for(school: school, channel_key: channel_key)

      deliveries.each do |delivery|
        if policy.enabled?("push")
          Notifications::SendPushNotificationJob.perform_later(delivery.id, school.id)
        else
          delivery.skip!
        end
      end
    end
  end
end
