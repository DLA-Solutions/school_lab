# frozen_string_literal: true

module Gateways
  module Push
    module Interface
      def deliver(token:, title:, body:, data: {})
        raise NotImplementedError
      end
    end
  end
end
