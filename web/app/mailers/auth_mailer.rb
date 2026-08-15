# frozen_string_literal: true

# Mail that is about getting into the system rather than about a school's own business, which is
# why it sits apart from `PeopleMailer`.
class AuthMailer < ApplicationMailer
  def password_reset
    @user = params[:user]
    @reset_url = SchoolLab::SchoolSpa.password_reset_url(token: params[:raw_token])

    mail(
      to: @user.email,
      subject: I18n.t("auth.mailer.password_reset.subject")
    )
  end
end
