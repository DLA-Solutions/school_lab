# frozen_string_literal: true

class MarketingMailer < ApplicationMailer
  def demo_request
    name = params[:name]
    email = params[:email]
    phone = params[:phone]
    submitted_at = params[:submitted_at]

    template_mail(
      template_alias: Gateways::Email::Templates::DEMO_REQUEST,
      to: SchoolLab::EmailDelivery.marketing_demo_request_recipients,
      subject: I18n.t("marketing.mailer.demo_request.subject", name: name),
      reply_to: email,
      tag: "marketing-demo-request",
      template_model: {
        name: name,
        email: email,
        phone: phone,
        submitted_at: I18n.l(submitted_at, format: :long)
      }
    )
  end
end
