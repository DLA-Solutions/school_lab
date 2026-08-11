# frozen_string_literal: true

module People
  class InviteMembershipNotificationJob < ApplicationJob
    queue_as :default

    def perform(membership_id, raw_token = nil)
      membership = Membership.kept.includes(:user, :school).find_by(id: membership_id)
      return unless membership
      return if raw_token.blank?

      unless SchoolLab::EmailDelivery.configured?
        Rails.logger.warn(
          "[People::InviteMembershipNotificationJob] Skipped invite e-mail for membership=#{membership.id} " \
          "— POSTMARK_API_TOKEN is not configured"
        )
        return
      end

      PeopleMailer.with(membership: membership, raw_token: raw_token)
                  .membership_invite
                  .deliver_later

      Rails.logger.info(
        "[People::InviteMembershipNotificationJob] Invite e-mail queued for membership=#{membership.id} " \
        "user=#{membership.user.email} school=#{membership.school_id}"
      )
    end
  end
end
