# frozen_string_literal: true

module Gateways
  module Email
    # Logs template payloads locally and in tests — never calls Postmark.
    class Fake
      include Interface

      class << self
        attr_accessor :deliveries

        def reset!
          @deliveries = []
        end
      end

      self.deliveries = []

      def send_template(message)
        self.class.deliveries << message

        Rails.logger.info(
          {
            event: "email.fake_delivery",
            template_alias: message.template_alias,
            to: message.to,
            tag: message.tag,
            template_model: message.template_model
          }.to_json
        )

        ValueObjects::DeliveryResult.new(message_id: "fake-#{SecureRandom.hex(8)}")
      end
    end
  end
end
