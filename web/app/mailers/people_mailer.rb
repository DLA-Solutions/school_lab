# frozen_string_literal: true

class PeopleMailer < ApplicationMailer
  def membership_invite
    membership = params[:membership]
    school = membership.school
    recipient_email = membership.user.email
    invite_url = SchoolLab::SchoolSpa.invite_accept_url(
      token: params[:raw_token],
      email: recipient_email
    )

    template_mail(
      template_alias: Gateways::Email::Templates::MEMBERSHIP_INVITE,
      to: recipient_email,
      subject: I18n.t("people.mailer.membership_invite.subject", school: school.name),
      tag: "people-membership-invite",
      template_model: {
        school_name: school.name,
        cta_url: invite_url,
        expiry_days: Gateways::Email::Templates::MEMBERSHIP_INVITE_EXPIRY_DAYS
      }
    )
  end
end
