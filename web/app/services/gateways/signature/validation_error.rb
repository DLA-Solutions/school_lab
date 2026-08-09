# frozen_string_literal: true

module Gateways
  module Signature
    # The provider refused the request as given (a malformed signer, a rejected file).
    class ValidationError < Error; end
  end
end
