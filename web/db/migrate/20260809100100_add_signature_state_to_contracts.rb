# frozen_string_literal: true

# A contract is sent to the family before it is in force. There is no e-signature provider wired
# up, so this records the state the school moves the contract through by hand.
class AddSignatureStateToContracts < ActiveRecord::Migration[8.1]
  def up
    add_column :contracts, :signature_status, :string, null: false, default: "pending_signature"
    add_column :contracts, :sent_at, :datetime
    add_column :contracts, :signed_at, :datetime

    add_index :contracts, %i[school_id signature_status],
              name: "index_contracts_on_school_id_and_signature_status"

    add_check_constraint :contracts,
                         "signature_status IN ('pending_signature', 'signed')",
                         name: "contracts_signature_status_valid"

    # Contracts that predate this column are already in force — they were created without any
    # signature step, so defaulting them to "pending" would misreport live agreements as unsent.
    execute <<~SQL.squish
      UPDATE contracts
      SET signature_status = 'signed', signed_at = created_at, sent_at = created_at
      WHERE discarded_at IS NULL
    SQL
  end

  def down
    remove_check_constraint :contracts, name: "contracts_signature_status_valid"
    remove_index :contracts, name: "index_contracts_on_school_id_and_signature_status"
    remove_column :contracts, :signature_status
    remove_column :contracts, :sent_at
    remove_column :contracts, :signed_at
  end
end
