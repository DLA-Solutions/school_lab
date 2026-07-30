# frozen_string_literal: true

module People
  class InviteMembershipNotificationJob < ApplicationJob
    queue_as :default

    def perform(membership_id)
      membership = Membership.kept.find_by(id: membership_id)
      return unless membership

      Rails.logger.info(
        "[People::InviteMembershipNotificationJob] Invite enqueued for membership=#{membership.id} " \
        "user=#{membership.user.email} school=#{membership.school_id}"
      )
    end
  end
end
