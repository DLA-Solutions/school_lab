# frozen_string_literal: true

module SchoolLab
  module Integrations
    module Fcm
      # FCM reported this device token as no longer registered (HTTP 404, `errorCode:
      # "UNREGISTERED"`) — the token is dead and the adapter layer needs to tell the caller to
      # discard it (BR-N09), not just log a generic provider failure.
      class UnregisteredTokenError < Error; end
    end
  end
end
