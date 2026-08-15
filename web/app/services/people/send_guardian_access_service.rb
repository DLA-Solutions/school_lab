# frozen_string_literal: true

module People
  # Gives a guardian a way into the system, and re-gives it when they have lost it.
  #
  # A guardian is a register entry, not an account: the rows the school types in carry no user at
  # all. This provisions what is missing — a user for their address and a membership marking them
  # as a guardian of this school — and mails them the link that sets their password.
  #
  # It is deliberately the same call whether or not they have been here before. A school pressing
  # "send access" does not know, and should not have to: someone who never set a password gets an
  # invitation, and someone who has one gets the means to reset it. Both end at a screen where
  # they choose a password, which is the only outcome the school cares about.
  class SendGuardianAccessService < ApplicationService
    def initialize(guardian:, actor: nil)
      @guardian = guardian
      @actor = actor
    end

    def call
      return no_email if guardian.email.blank?
      return inactive if guardian.discarded?

      membership = nil

      ActiveRecord::Base.transaction do
        user = find_or_create_user
        return user if user.is_a?(ResponseService)

        guardian.update!(user: user) if guardian.user_id != user.id
        membership = find_or_create_membership(user)
      end

      deliver(membership)
    end

    private

    attr_reader :guardian, :actor

    def normalized_email
      @normalized_email ||= guardian.email.to_s.strip.downcase
    end

    # One user per address. A guardian whose address already belongs to somebody — a member of
    # staff who is also a parent, most often — joins that account rather than shadowing it.
    def find_or_create_user
      existing = User.find_by("LOWER(email) = ?", normalized_email)
      return existing if existing

      user = User.new(
        email: normalized_email,
        # Set by the guardian from the link they are about to receive. Devise needs a value to
        # save the row, and a random one nobody holds cannot be used to sign in.
        password: SecureRandom.base58(24) + "aA1!",
        status: "active",
        # The invitation is itself proof they reached the address, so there is no second mail to
        # confirm it — the link only works from their inbox.
        confirmed_at: Time.current
      )

      return validation_failure(user) unless user.save

      user
    end

    def find_or_create_membership(user)
      existing = guardian.school.memberships.find_by(user: user, role: "guardian")
      return existing if existing

      guardian.school.memberships.create!(user: user, role: "guardian", status: "invited")
    end

    # Someone who never chose a password is invited; someone who has one is sent a reset. Asking
    # a guardian who already has an account to "accept an invitation" reads as a mistake, and the
    # invite token would activate a membership that is already active.
    def deliver(membership)
      if membership.invited?
        People::InviteMembershipService.call(membership: membership, inviter: actor)
      else
        Auth::RequestPasswordResetService.call(email: membership.user.email)
      end

      Rails.logger.info(
        { event: "guardian.access_sent", guardian_id: guardian.id,
          membership_status: membership.status, actor_id: actor&.id }.to_json
      )

      ResponseService.success(data: { guardian: guardian, membership: membership })
    end

    def no_email
      ResponseService.failure(
        code: :validation_error,
        details: { email: [ I18n.t("api.errors.guardian_without_email") ] }
      )
    end

    def inactive
      ResponseService.failure(
        code: :validation_error,
        details: { base: [ I18n.t("api.errors.guardian_inactive") ] }
      )
    end

    def validation_failure(user)
      ResponseService.failure(code: :validation_error, details: user.errors.to_hash)
    end
  end
end
