# frozen_string_literal: true

# What the backoffice may see of a school's e-signature configuration.
#
# The API token is absent by design and has no view that includes it: it is stored encrypted and
# is never read back out, so the screen can only ever show that one is registered and when.
class SchoolSignatureProviderBlueprint < Blueprinter::Base
  identifier :id

  fields :school_id, :provider, :active, :uploaded_at, :uploaded_by_id

  # Where Autentique must be told to post its callbacks. Not a secret — it only identifies which
  # school a delivery is for; the body is authenticated by the HMAC signature.
  field :webhook_path do |config|
    "/webhooks/signatures/#{config.webhook_endpoint_token}"
  end

  # Whether a callback can be verified at all. A configuration without one answers 401 to every
  # delivery and the school never learns that a family signed, so the screen has to be able to
  # say it out loud.
  field :webhook_secret_set do |config|
    config.webhook_secret.present?
  end

  # The secret in the clear, once, on the response to registering it — it has to be pasted into
  # Autentique's own settings and cannot be read back afterwards.
  view :with_secret do
    field :webhook_secret
  end
end
