# frozen_string_literal: true

module Identity
  class IssueMembershipInviteTokenService < ApplicationService
    DEFAULT_EXPIRY = 7.days

    def initialize(membership:, inviter: nil)
      @membership = membership
      @inviter = inviter
    end

    def call
      return ResponseService.failure(code: :validation_error) unless membership.invited?

      raw_token = nil
      token_record = nil

      ActiveRecord::Base.transaction do
        invalidate_unused_tokens!
        raw_token = SecureRandom.urlsafe_base64(32)
        token_record = membership.membership_invite_tokens.create!(
          school_id: membership.school_id,
          token_digest: digest(raw_token),
          expires_at: DEFAULT_EXPIRY.from_now,
          created_by: inviter
        )
      end

      ResponseService.success(data: { raw_token: raw_token, token: token_record })
    end

    def self.digest(raw_token)
      Digest::SHA256.hexdigest(raw_token)
    end

    private

    attr_reader :membership, :inviter

    def invalidate_unused_tokens!
      membership.membership_invite_tokens.unused.update_all(used_at: Time.current, updated_at: Time.current)
    end

    def digest(raw_token)
      self.class.digest(raw_token)
    end
  end
end
