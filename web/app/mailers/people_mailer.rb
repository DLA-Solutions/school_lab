# frozen_string_literal: true

class PeopleMailer < ApplicationMailer
  def membership_invite
    @membership = params[:membership]
    @school = @membership.school
    @recipient_email = @membership.user.email
    @invite_url = SchoolLab::SchoolSpa.invite_accept_url(
      token: params[:raw_token],
      email: @recipient_email
    )

    mail(
      to: @recipient_email,
      subject: I18n.t("people.mailer.membership_invite.subject", school: @school.name)
    )
  end
end
