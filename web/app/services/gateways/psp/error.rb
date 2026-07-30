# frozen_string_literal: true

module Gateways
  module Psp
    class Error < StandardError; end

    class InvalidSignatureError < Error; end
  end
end
