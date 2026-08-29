# frozen_string_literal: true

module Backoffice
  # Registers a school's Autentique API token so contracts can be sent for signature.
  #
  # Shared by the backoffice endpoint and the `signature:register` rake task, so the screen and
  # the terminal cannot drift apart on what registering means — one active row per school, a
  # webhook secret always present, and the token stored encrypted.
  class RegisterSignatureCredentialsService < ApplicationService
    def initialize(school:, actor:, provider:, api_token:, webhook_secret: nil)
      @school = school
      @actor = actor
      @provider = provider
      @api_token = api_token
      @webhook_secret = webhook_secret
    end

    def call
      # A boundary rule rather than a model validation: `fake` has to stay writable by seeds and
      # factories, it just may not be registered by whoever calls the API.
      unless Gateways::Signature::Registry.api_selectable?(provider)
        return ResponseService.failure(code: :validation_error, details: { provider: [ "inclusion" ] })
      end

      return ResponseService.failure(code: :validation_error, details: { api_token: [ "blank" ] }) if api_token.blank?

      record = nil
      ActiveRecord::Base.transaction do
        config = SchoolSignatureProvider.find_or_initialize_by(school: school, provider: provider)
        config.assign_attributes(api_token: api_token, active: true, uploaded_at: Time.current,
                                 uploaded_by: actor)

        # Autentique signs each callback with HMAC-SHA256 over the raw body, and the verifier
        # refuses everything when there is no secret to compare against — so a school registered
        # without one answers 401 to every delivery and never learns that a family signed.
        config.webhook_secret = webhook_secret.presence ||
                                config.webhook_secret.presence ||
                                SecureRandom.hex(32)

        # One active provider per school is a partial unique index; anything else the school had
        # registered stands down rather than colliding.
        SchoolSignatureProvider.where(school: school).where.not(id: config.id)
                               .update_all(active: false)

        config.save!
        record = config
      end

      ResponseService.success(data: record)
    rescue ActiveRecord::RecordInvalid => e
      ResponseService.failure(code: :validation_error, details: e.record.errors.to_hash)
    end

    private

    attr_reader :school, :actor, :provider, :api_token, :webhook_secret
  end
end
