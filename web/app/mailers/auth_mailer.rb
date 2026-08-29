# frozen_string_literal: true

# Mail that is about getting into the system rather than about a school's own business, which is
# why it sits apart from `PeopleMailer`.
class AuthMailer < ApplicationMailer
  def password_reset
    user = params[:user]
    cta_url = SchoolLab::SchoolSpa.password_reset_url(token: params[:raw_token])

    template_mail(
      template_alias: Gateways::Email::Templates::PASSWORD_RESET,
      to: user.email,
      subject: I18n.t("auth.mailer.password_reset.subject"),
      tag: "auth-password-reset",
      template_model: {
        cta_url: cta_url,
        expiry_hours: Gateways::Email::Templates::PASSWORD_RESET_EXPIRY_HOURS
      }
    )
  end
end
