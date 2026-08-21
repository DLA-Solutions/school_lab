# frozen_string_literal: true

module Marketing
  class SubmitDemoRequestService < ApplicationService
    COOLDOWN = 5.minutes
    CACHE_KEY_PREFIX = "marketing_demo_request"
    NAME_MAX_LENGTH = 120
    PHONE_MAX_LENGTH = 30

    def initialize(params:, client_ip:)
      @params = params
      @client_ip = client_ip
    end

    def call
      return ResponseService.success if honeypot_filled?

      validation_errors = validate
      if validation_errors.present?
        return ResponseService.failure(code: :validation_error, details: validation_errors)
      end

      return ResponseService.failure(code: :rate_limited) if rate_limited?

      enqueue_email!
      mark_rate_limited!
      ResponseService.success
    end

    private

    attr_reader :params, :client_ip

    def honeypot_filled?
      params.values_at(:website, :_hp).compact_blank.any?
    end

    def validate
      errors = {}

      name = params[:name].to_s.strip
      if name.blank?
        errors[:name] = [ I18n.t("errors.messages.blank") ]
      elsif name.length > NAME_MAX_LENGTH
        errors[:name] = [ I18n.t("errors.messages.too_long", count: NAME_MAX_LENGTH) ]
      end

      email = params[:email].to_s.strip
      if email.blank?
        errors[:email] = [ I18n.t("errors.messages.blank") ]
      elsif email !~ URI::MailTo::EMAIL_REGEXP
        errors[:email] = [ I18n.t("errors.messages.invalid") ]
      end

      phone = params[:phone].to_s.strip
      if phone.blank?
        errors[:phone] = [ I18n.t("errors.messages.blank") ]
      elsif phone.length > PHONE_MAX_LENGTH
        errors[:phone] = [ I18n.t("errors.messages.too_long", count: PHONE_MAX_LENGTH) ]
      end

      errors.presence
    end

    def cache_key
      "#{CACHE_KEY_PREFIX}:#{client_ip}"
    end

    def rate_limited?
      Rails.cache.read(cache_key).present?
    end

    def mark_rate_limited!
      Rails.cache.write(cache_key, true, expires_in: COOLDOWN)
    end

    def enqueue_email!
      MarketingMailer.with(
        name: params[:name].to_s.strip,
        email: params[:email].to_s.strip,
        phone: params[:phone].to_s.strip,
        submitted_at: Time.current
      ).demo_request.deliver_later
    end
  end
end
