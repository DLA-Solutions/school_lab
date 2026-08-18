# frozen_string_literal: true

module Auth
  class LinkOrResolveIdentityService < ApplicationService
    def initialize(provider:, provider_uid:, email:, email_verified:, now: Time.current)
      @provider = provider
      @provider_uid = provider_uid
      @email = email.to_s.downcase.strip
      @email_verified = email_verified
      @now = now
    end

    def call
      return ResponseService.failure(code: :access_denied) unless email_verified

      identity = UserIdentity.find_by(provider: provider, provider_uid: provider_uid)
      if identity
        return ResponseService.failure(code: :access_denied) unless identity.user.kept?
        return ResponseService.failure(code: :access_denied) if identity.user.email != email

        update_identity!(identity)
        return ResponseService.success(data: { user: identity.user, identity: identity })
      end

      user = User.kept.find_by(email: email)
      return ResponseService.failure(code: :access_denied) if user.blank?

      existing = user.user_identities.find_by(provider: provider)
      return ResponseService.failure(code: :access_denied) if existing.present? && existing.provider_uid != provider_uid

      identity = existing || user.user_identities.build(provider: provider)
      identity.assign_attributes(
        provider_uid: provider_uid,
        email: email,
        email_verified: email_verified,
        linked_at: identity.linked_at || now,
        last_used_at: now
      )
      identity.save!

      ResponseService.success(data: { user: user, identity: identity })
    rescue ActiveRecord::RecordInvalid, ActiveRecord::RecordNotUnique
      ResponseService.failure(code: :access_denied)
    end

    private

    attr_reader :provider, :provider_uid, :email, :email_verified, :now

    def update_identity!(identity)
      identity.update!(
        email: email,
        email_verified: email_verified,
        last_used_at: now
      )
    end
  end
end
