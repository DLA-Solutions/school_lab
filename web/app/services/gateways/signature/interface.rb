# frozen_string_literal: true

module Gateways
  module Signature
    module Interface
      # Uploads the agreement and asks the provider to collect signatures from every signer.
      def create_document(request)
        raise NotImplementedError
      end

      # Reads a document back, for reconciliation when a webhook was missed.
      def fetch_document(provider_document_id:)
        raise NotImplementedError
      end
    end
  end
end
