# frozen_string_literal: true

module SchoolLab
  # Routes Action Mailer deliveries through Gateways::Email (Postmark templates in production,
  # Fake in development and test).
  class EmailGatewayDeliveryMethod
    TEMPLATE_ALIAS_HEADER = "X-Template-Alias"
    TEMPLATE_MODEL_HEADER = "X-Template-Model"
    TEMPLATE_TAG_HEADER = "X-Template-Tag"

    def initialize(settings = {}); end

    def deliver!(mail)
      message = Gateways::Email::ValueObjects::TemplateMessage.new(
        template_alias: mail[TEMPLATE_ALIAS_HEADER].to_s,
        to: mail.to,
        from: Array(mail.from).first,
        subject: mail.subject,
        template_model: parse_template_model(mail[TEMPLATE_MODEL_HEADER].to_s),
        tag: mail[TEMPLATE_TAG_HEADER]&.to_s.presence,
        reply_to: mail.reply_to
      )

      Gateways::Email::Registry.current.send_template(message)
    end

    private

    def parse_template_model(raw)
      return {} if raw.blank?

      JSON.parse(raw)
    rescue JSON::ParserError
      {}
    end
  end
end
