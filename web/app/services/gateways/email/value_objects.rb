# frozen_string_literal: true

module Gateways
  module Email
    module ValueObjects
      TemplateMessage = Data.define(
        :template_alias,
        :to,
        :from,
        :subject,
        :template_model,
        :tag,
        :reply_to
      ) do
        def initialize(template_alias:, to:, subject:, template_model:, from: nil, tag: nil, reply_to: nil)
          super(
            template_alias: template_alias,
            to: Array(to),
            from: from || SchoolLab::EmailDelivery.from_address,
            subject: subject,
            template_model: template_model.deep_symbolize_keys,
            tag: tag,
            reply_to: Array(reply_to).compact.presence
          )
        end
      end

      DeliveryResult = Data.define(:message_id)
    end
  end
end
