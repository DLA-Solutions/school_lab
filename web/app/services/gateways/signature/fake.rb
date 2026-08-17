# frozen_string_literal: true

module Gateways
  module Signature
    # Reports success and fabricates a document nobody ever signs. Used by seeds, specs and local
    # development so the flow can be exercised without an Autentique account — never selectable
    # through the API, for the same reason the fake bank slip adapter is not.
    class Fake
      include Interface

      PROVIDER = "fake"

      def initialize(school:, config: nil)
        @school = school
        @config = config
        @documents = {}
      end

      def create_document(request)
        provider_document_id = "fake-doc-#{school.id}-#{SecureRandom.hex(4)}"

        document = ValueObjects::RemoteDocument.new(
          provider_document_id: provider_document_id,
          status: "pending",
          signer_links: request.signers.map do |signer|
            ValueObjects::SignerLink.new(
              email: signer.email,
              url: "https://fake-autentique.example/sign/#{provider_document_id}/#{signer.cpf}"
            )
          end,
        )

        @documents[provider_document_id] = document
        document
      end

      def fetch_document(provider_document_id:)
        @documents.fetch(provider_document_id) do
          ValueObjects::RemoteDocument.new(
            provider_document_id: provider_document_id, status: "pending"
          )
        end
      end

      def cancel_document(provider_document_id:)
        @documents.delete(provider_document_id)
        true
      end

      private

      attr_reader :school, :config
    end
  end
end
