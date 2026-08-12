# frozen_string_literal: true

module Auth
  class AcceptInviteService < ApplicationService
    def initialize(token:, password:, password_confirmation: nil, name: nil)
      @token = token.to_s
      @password = password
      @password_confirmation = password_confirmation.presence || password
      @name = name.to_s.strip.presence
    end

    def call
      return ResponseService.failure(code: :invalid_invite_token) if token.blank?

      invite_token = find_active_token
      return ResponseService.failure(code: :invalid_invite_token) if invite_token.blank?

      membership = invite_token.membership
      user = membership.user

      if invite_password_pending?(user) && name.blank?
        return ResponseService.failure(
          code: :validation_error,
          details: { name: [ I18n.t("errors.messages.blank") ] }
        )
      end

      ActiveRecord::Base.transaction do
        unless user.update(
          password: password,
          password_confirmation: password_confirmation
        )
          return ResponseService.failure(code: :validation_error, details: user.errors.to_hash)
        end

        invite_token.update!(used_at: Time.current)

        activation = ::People::AcceptMembershipService.call(membership: membership, user: user)
        return activation unless activation.success?
      end

      ResponseService.success(data: { user_id: user.id, membership_id: membership.id })
    end

    private

    attr_reader :token, :password, :password_confirmation, :name

    def find_active_token
      MembershipInviteToken.active.find_by(token_digest: Identity::IssueMembershipInviteTokenService.digest(token))
    end

    def invite_password_pending?(user)
      user.encrypted_password.blank?
    end
  end
end
