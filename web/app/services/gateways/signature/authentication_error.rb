# frozen_string_literal: true

module Gateways
  module Signature
    # The credentials were rejected — retrying with the same token cannot help.
    class AuthenticationError < Error; end
  end
end
