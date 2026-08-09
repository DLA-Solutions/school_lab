# frozen_string_literal: true

module Gateways
  module Signature
    module ValueObjects
      # What the adapter is handed: a rendered agreement and who must sign it.
      SignatureRequest = Data.define(:name, :pdf, :filename, :signers, :message, :content_type) do
        def initialize(name:, pdf:, filename:, signers:, message: nil, content_type: "application/pdf")
          super
        end
      end

      # One party. `cpf` is bare digits — the provider is told to demand that document from
      # whoever opens the link, so the person who signs is the person on the contract.
      #
      # `positions` says where the signature is drawn, as `{ x:, y:, z: }` in percent of the page
      # from its top-left corner. Empty leaves the placement to the provider's default.
      Signer = Data.define(:name, :email, :cpf, :positions) do
        def initialize(name:, email:, cpf:, positions: [])
          super
        end
      end

      # What came back: the provider's own id for the document, and where each signer must go.
      RemoteDocument = Data.define(:provider_document_id, :status, :signer_links) do
        def initialize(provider_document_id:, status:, signer_links: [])
          super
        end
      end

      SignerLink = Data.define(:email, :url)
    end
  end
end
