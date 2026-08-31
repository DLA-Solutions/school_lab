# frozen_string_literal: true

module Gateways
  module Email
    module Interface
      def send_template(message)
        raise NotImplementedError
      end
    end
  end
end
