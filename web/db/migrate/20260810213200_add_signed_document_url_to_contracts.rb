# frozen_string_literal: true

# Where the signed agreement itself lives, once the family has signed it.
#
# Autentique serves it at a stable address derived from the document id, so this is a cache of a
# URL rather than of a file: the school opens the real signed PDF, with the signature page the
# provider appends, instead of our re-render of the agreement we sent.
class AddSignedDocumentUrlToContracts < ActiveRecord::Migration[8.1]
  def change
    add_column :contracts, :signed_document_url, :string
  end
end
