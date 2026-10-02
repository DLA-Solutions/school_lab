# frozen_string_literal: true

module Gateways
  module Push
    # Logs push payloads locally and in tests — never calls FCM.
    class Fake
      include Interface

      class << self
        attr_accessor :deliveries

        def reset!
          @deliveries = []
        end
      end

      self.deliveries = []

      def deliver(token:, title:, body:, data: {})
        message = { token: token, title: title, body: body, data: data }
        self.class.deliveries << message

        Rails.logger.info(
          {
            event: "push.fake_delivery",
            token: token,
            title: title
          }.to_json
        )

        ValueObjects::DeliveryResult.new(message_id: "fake-#{SecureRandom.hex(8)}")
      end
    end
  end
end
