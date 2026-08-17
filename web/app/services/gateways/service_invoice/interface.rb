# frozen_string_literal: true

module Gateways
  module ServiceInvoice
    module Interface
      def issue(request)
        raise NotImplementedError
      end

      def fetch(provider_document_id:)
        raise NotImplementedError
      end

      def check_status(provider_document_id:)
        raise NotImplementedError
      end

      def cancel(provider_document_id:, reason: nil)
        raise NotImplementedError
      end

      def download_artifacts(provider_document_id:)
        raise NotImplementedError
      end

      def list_documents(since:, limit: 100)
        raise NotImplementedError
      end

      def list_supported_cities(query: nil, state: nil, code: nil)
        raise NotImplementedError
      end

      def capabilities
        raise NotImplementedError
      end
    end
  end
end
