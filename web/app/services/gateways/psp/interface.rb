# frozen_string_literal: true

module Gateways
  module Psp
    module Interface
      def issue(charge:)
        raise NotImplementedError
      end

      def verify_signature(payload:, signature:)
        raise NotImplementedError
      end

      def sign_payload(payload:)
        raise NotImplementedError
      end
    end
  end
end
