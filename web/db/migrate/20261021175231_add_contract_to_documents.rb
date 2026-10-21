class AddContractToDocuments < ActiveRecord::Migration[8.1]
  # The signed copy of a contract is a document of its own. The link is nullable because almost
  # every document is not one, and the partial unique index is what keeps a replayed webhook or a
  # re-run sweep from filing the same contract twice.
  def change
    add_reference :documents, :contract, null: true, foreign_key: true, index: false
    add_index :documents, :contract_id,
              unique: true,
              where: "contract_id IS NOT NULL",
              name: "index_documents_on_contract_id_unique"
  end
end
