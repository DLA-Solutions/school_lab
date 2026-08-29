# frozen_string_literal: true

class ApplicationMailer < ActionMailer::Base
  default from: -> { SchoolLab::EmailDelivery.from_address }
  layout false

  private

  def template_mail(template_alias:, to:, subject:, template_model:, tag: nil, reply_to: nil)
    headers[SchoolLab::EmailGatewayDeliveryMethod::TEMPLATE_ALIAS_HEADER] = template_alias
    headers[SchoolLab::EmailGatewayDeliveryMethod::TEMPLATE_MODEL_HEADER] =
      template_model.deep_stringify_keys.to_json
    headers[SchoolLab::EmailGatewayDeliveryMethod::TEMPLATE_TAG_HEADER] = tag if tag.present?

    mail(
      to: to,
      subject: subject,
      reply_to: reply_to,
      body: plain_text_body(template_model)
    )
  end

  def plain_text_body(template_model)
    template_model.map { |key, value| "#{key}: #{value}" }.join("\n")
  end
end
