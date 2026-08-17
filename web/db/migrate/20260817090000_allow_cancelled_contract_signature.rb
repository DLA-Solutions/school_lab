# frozen_string_literal: true

# A contract sent for signature can be called off — the school spotted a wrong figure and has to
# reissue it, or the family decided not to sign. It stays on record as cancelled rather than
# being deleted: when the reason was an error, the cancelled one is the context for the corrected
# contract that follows it.
class AllowCancelledContractSignature < ActiveRecord::Migration[8.1]
  def up
    remove_check_constraint :contracts, name: "contracts_signature_status_valid"
    add_check_constraint :contracts,
                         "signature_status IN ('pending_signature', 'signed', 'cancelled')",
                         name: "contracts_signature_status_valid"

    # When it was called off, which is what the listing shows next to the chip.
    add_column :contracts, :signature_cancelled_at, :datetime
  end

  def down
    remove_column :contracts, :signature_cancelled_at

    # Nothing may be left outside the narrower constraint it is about to be checked against.
    execute <<~SQL.squish
      UPDATE contracts SET signature_status = 'pending_signature' WHERE signature_status = 'cancelled'
    SQL

    remove_check_constraint :contracts, name: "contracts_signature_status_valid"
    add_check_constraint :contracts,
                         "signature_status IN ('pending_signature', 'signed')",
                         name: "contracts_signature_status_valid"
  end
end
