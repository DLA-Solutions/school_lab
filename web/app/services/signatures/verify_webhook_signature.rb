# frozen_string_literal: true

module Signatures
  # HMAC-SHA256 over the raw body, compared in constant time, as Autentique's webhook
  # documentation specifies.
  module VerifyWebhookSignature
    module_function

    def call(payload:, signature:, secret:)
      # A configuration with no secret cannot authenticate anything: refuse rather than accept
      # every caller who finds the URL.
      return false if secret.blank? || signature.blank?

      expected = OpenSSL::HMAC.hexdigest("SHA256", secret, payload.to_s)

      ActiveSupport::SecurityUtils.secure_compare(expected, normalize(signature))
    end

    # Some senders prefix the digest with the algorithm; accept either shape.
    def normalize(signature)
      signature.to_s.sub(/\Asha256=/, "").strip
    end
  end
end
