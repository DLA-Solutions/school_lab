# frozen_string_literal: true

class MarketingMailer < ApplicationMailer
  def demo_request
    @name = params[:name]
    @email = params[:email]
    @phone = params[:phone]
    @submitted_at = params[:submitted_at]

    mail(
      to: SchoolLab::EmailDelivery.marketing_demo_request_recipients,
      reply_to: @email,
      subject: I18n.t("marketing.mailer.demo_request.subject", name: @name)
    )
  end
end
