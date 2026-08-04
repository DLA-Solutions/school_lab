# frozen_string_literal: true

module Auth
  # Single source for the JWT signing secret, shared by the encode and decode services.
  #
  # A default shared across deployments would let anyone holding this repository forge a
  # token for any user of any school, bypassing every Pundit policy before it runs. Only
  # development and test get a fallback, so the suite runs without credentials.
  #
  # The environment wins over the credentials because staging runs with RAILS_ENV=production
  # and therefore reads the same credentials file as production. Each Kamal destination
  # supplies its own key, so a token minted in staging is not valid in production, where the
  # same user id belongs to somebody else.
  module SigningSecret
    LOCAL_FALLBACK = "development-only-jwt-signing-secret"

    def self.fetch
      configured = ENV["JWT_SECRET_KEY"].presence ||
                   Rails.application.credentials.dig(:jwt, :secret_key).presence

      return configured if configured
      return LOCAL_FALLBACK if Rails.env.local?

      raise "JWT signing secret missing. Set JWT_SECRET_KEY for this destination in " \
            ".kamal/secrets.<destination> — see docs/guidelines/process/deployment.md."
    end
  end
end
