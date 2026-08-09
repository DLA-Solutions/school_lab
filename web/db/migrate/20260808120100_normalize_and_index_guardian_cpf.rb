# frozen_string_literal: true

# CPF becomes a required, per-school unique identifier. Uniqueness is only meaningful once the
# column holds one canonical form: "123.456.789-09" and "12345678909" are the same document, and
# an index over the raw text would let both through.
class NormalizeAndIndexGuardianCpf < ActiveRecord::Migration[8.1]
  INDEX_NAME = "index_guardians_on_school_id_and_cpf_kept"

  def up
    # Strip every non-digit so the index compares documents, not typing habits.
    execute <<~SQL.squish
      UPDATE guardians
      SET cpf = regexp_replace(cpf, '[^0-9]', '', 'g')
      WHERE cpf IS NOT NULL
    SQL

    guard_against_existing_duplicates!

    add_index :guardians,
              %i[school_id cpf],
              unique: true,
              where: "discarded_at IS NULL AND cpf IS NOT NULL",
              name: INDEX_NAME
  end

  def down
    remove_index :guardians, name: INDEX_NAME
  end

  private

  # Normalising can reveal duplicates that the unformatted column was hiding. Fail loudly with the
  # offending rows instead of letting `add_index` abort with an opaque constraint error.
  def guard_against_existing_duplicates!
    duplicates = select_all(<<~SQL.squish).to_a
      SELECT school_id, cpf, array_agg(id ORDER BY id) AS guardian_ids
      FROM guardians
      WHERE discarded_at IS NULL AND cpf IS NOT NULL
      GROUP BY school_id, cpf
      HAVING COUNT(*) > 1
    SQL

    return if duplicates.empty?

    details = duplicates.map { |row| "school #{row['school_id']} cpf #{row['cpf']} => ids #{row['guardian_ids']}" }

    raise ActiveRecord::IrreversibleMigration,
          "Guardians share a CPF within the same school; merge or discard them before migrating:\n" +
          details.join("\n")
  end
end
