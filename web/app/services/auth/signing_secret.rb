# frozen_string_literal: true

module Auth
  # Single source for the JWT signing secret, shared by the encode and decode services.
  #
  # A default shared across deployments would let anyone holding this repository forge a
  # token for any user of any school, bypassing every Pundit policy before it runs. Only
  # development and test get a fallback, so the suite runs without credentials.
  module SigningSecret
    LOCAL_FALLBACK = "development-only-jwt-signing-secret"

    def self.fetch
      configured = Rails.application.credentials.dig(:jwt, :secret_key).presence ||
                   ENV["JWT_SECRET_KEY"].presence

      return configured if configured
      return LOCAL_FALLBACK if Rails.env.local?

      raise "JWT signing secret missing. Set jwt.secret_key in the encrypted credentials " \
            "or JWT_SECRET_KEY in the environment."
    end
  end
end
