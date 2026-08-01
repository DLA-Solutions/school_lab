# frozen_string_literal: true

module Webhooks
  module Parsers
    class Registry
      PARSERS = {
        "cora" => Cora,
        "fake" => Fake
      }.freeze

      class UnknownProviderError < StandardError; end

      class << self
        def for(provider)
          parser = PARSERS[provider.to_s]
          raise UnknownProviderError, "No webhook parser for provider #{provider.inspect}" unless parser

          parser
        end
      end
    end
  end
end
