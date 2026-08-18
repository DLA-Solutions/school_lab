# frozen_string_literal: true

module Schools
  class ResendProvisioningInvitesService < ApplicationService
    COOLDOWN = 5.minutes
    CACHE_KEY_PREFIX = "provisioning_resend_invites"

    def initialize(school:, actor:)
      @school = school
      @actor = actor
    end

    def call
      return ResponseService.failure(code: :rate_limited) if rate_limited?

      pending = school.memberships.kept.invited.where(role: %w[staff school])
      if pending.none?
        return ResponseService.failure(
          code: :validation_error,
          details: { invites: [ "no pending invites" ] }
        )
      end

      resent_count = 0
      pending.find_each do |membership|
        result = People::InviteMembershipService.call(membership: membership, inviter: actor)
        return result if result.failure?

        resent_count += 1
      end

      mark_rate_limited!
      ResponseService.success(data: { resent_count: resent_count })
    end

    private

    attr_reader :school, :actor

    def cache_key
      "#{CACHE_KEY_PREFIX}:#{school.id}"
    end

    def rate_limited?
      Rails.cache.read(cache_key).present?
    end

    def mark_rate_limited!
      Rails.cache.write(cache_key, true, expires_in: COOLDOWN)
    end
  end
end
