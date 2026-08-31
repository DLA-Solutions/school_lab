# frozen_string_literal: true

module Gateways
  module Email
    module Postmark
      class Adapter
        include Interface

        def initialize(client: nil)
          @client = client
        end

        def send_template(message)
          response = client.deliver_with_template(build_payload(message))
          message_id = response[:message_id] || response["MessageID"]

          ValueObjects::DeliveryResult.new(message_id: message_id)
        rescue ::Postmark::InactiveRecipientError, ::Postmark::ApiInputError => error
          raise ValidationError, error.message
        rescue ::Postmark::HttpServerError, ::Postmark::TimeoutError => error
          raise TransientError, error.message
        rescue ::Postmark::Error => error
          raise ProviderError, error.message
        end

        private

        def client
          @client ||= ::Postmark::ApiClient.new(ENV.fetch("POSTMARK_API_TOKEN"))
        end

        def build_payload(message)
          payload = {
            from: message.from,
            to: message.to.join(","),
            template_alias: message.template_alias,
            template_model: message.template_model.deep_stringify_keys,
            tag: message.tag
          }.compact

          if message.reply_to.present?
            payload[:reply_to] = message.reply_to.join(",")
          end

          payload
        end
      end
    end
  end
end
