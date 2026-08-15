# frozen_string_literal: true

module Gateways
  module Signature
    module ValueObjects
      # What the adapter is handed: a rendered agreement and who must sign it.
      # `copy_emails` receive the document without being asked to do anything with it — the
      # school's own copy of what it sent. Distinct from `signers`, who must act.
      SignatureRequest = Data.define(:name, :pdf, :filename, :signers, :message, :content_type,
                                     :copy_emails) do
        def initialize(name:, pdf:, filename:, signers:, message: nil,
                       content_type: "application/pdf", copy_emails: [])
          super
        end
      end

      # One party. `cpf` and `cnpj` are bare digits — the provider is told to demand that document
      # from whoever opens the link, so the party who signs is the party on the contract. A
      # guardian signs under a CPF and the school, as a legal entity, under its CNPJ; exactly one
      # of the two is set.
      #
      # `positions` says where the signature is drawn, as `{ x:, y:, z: }` in percent of the page
      # from its top-left corner. Empty leaves the placement to the provider's default.
      Signer = Data.define(:name, :email, :cpf, :cnpj, :positions) do
        def initialize(name:, email:, cpf: nil, cnpj: nil, positions: [])
          super
        end
      end

      # What came back: the provider's own id for the document, where each signer must go, and —
      # once everyone has signed — where the signed file itself can be read.
      RemoteDocument = Data.define(:provider_document_id, :status, :signer_links, :signed_file_url) do
        def initialize(provider_document_id:, status:, signer_links: [], signed_file_url: nil)
          super
        end
      end

      SignerLink = Data.define(:email, :url)
    end
  end
end
