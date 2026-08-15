# frozen_string_literal: true

module Auth
  # Mails whoever owns the address a link that sets a new password.
  #
  # Devise generates the token, but not the mail: `send_reset_password_instructions` builds its URL
  # from Devise's own routes, which this API does not mount — it raised "Could not find a valid
  # mapping", so the endpoint answered 204 while nothing was ever sent. The token is still Devise's
  # (and so is its expiry); only the delivery is ours, pointing at the SPA that collects the new
  # password.
  class RequestPasswordResetService < ApplicationService
    def initialize(email:)
      @email = email.to_s.downcase.strip
    end

    def call
      user = User.kept.find_by("LOWER(email) = ?", email)

      # Always the same answer, whether or not the address is registered. Anything else turns this
      # endpoint into a way of asking which families are on file.
      deliver(user) unless user.nil? || user.disabled?

      ResponseService.success
    end

    private

    attr_reader :email

    def deliver(user)
      raw_token = user.send(:set_reset_password_token)

      AuthMailer.with(user: user, raw_token: raw_token).password_reset.deliver_later
    end
  end
end
