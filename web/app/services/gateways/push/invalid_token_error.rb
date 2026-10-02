# frozen_string_literal: true

module Gateways
  module Push
    # Port-side counterpart of the lib's `UnregisteredTokenError` (BR-N09) — the job rescues this
    # to discard the `DeviceToken` the provider says is dead, without aborting delivery to the
    # user's other tokens.
    class InvalidTokenError < Error; end
  end
end
