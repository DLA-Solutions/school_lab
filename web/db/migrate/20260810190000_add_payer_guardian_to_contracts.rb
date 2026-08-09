# frozen_string_literal: true

# Both parents sign the contract, but the boletos go out in one name and one CPF — the bank slip
# is registered against a single payer. This says which of them that is.
class AddPayerGuardianToContracts < ActiveRecord::Migration[8.1]
  def up
    add_reference :contracts, :payer_guardian, foreign_key: { to_table: :guardians }

    # Existing contracts already bill somebody: their charges name them. Where there are none
    # yet, fall back to the student's first guardian, which is who the schedule would have used.
    execute <<~SQL.squish
      UPDATE contracts
      SET payer_guardian_id = charges.guardian_id
      FROM charges
      WHERE charges.contract_id = contracts.id
        AND contracts.payer_guardian_id IS NULL
    SQL

    execute <<~SQL.squish
      UPDATE contracts
      SET payer_guardian_id = links.guardian_id
      FROM student_guardians links
      WHERE links.student_id = contracts.student_id
        AND links.discarded_at IS NULL
        AND contracts.payer_guardian_id IS NULL
    SQL
  end

  def down
    remove_reference :contracts, :payer_guardian
  end
end
