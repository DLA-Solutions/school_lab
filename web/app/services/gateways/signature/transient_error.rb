# frozen_string_literal: true

module Gateways
  module Signature
    # Network trouble or a provider-side fault: the same request may succeed later.
    class TransientError < Error; end
  end
end
