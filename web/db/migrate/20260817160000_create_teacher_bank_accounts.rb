# frozen_string_literal: true

# Where a collaborator's salary is sent. Kept next to the person on file rather than inside the
# billing settings: the school pays a person, and whoever keeps the collaborator's register
# current is the one who learns their account changed.
#
# One per collaborator, not a history — the school pays into the account that is current, and a
# ledger of every account somebody ever gave would only make it harder to see which one that is.
class CreateTeacherBankAccounts < ActiveRecord::Migration[8.1]
  def change
    create_table :teacher_bank_accounts do |t|
      t.references :school, null: false, foreign_key: true
      t.references :teacher, null: false, foreign_key: true

      # A pix key is enough on its own, so it is the short road: no bank, no branch, no account.
      t.text :pix_key
      # The bank is free text on purpose. A code list decided here goes stale every time a bank
      # merges, and what the payer needs is the name they will recognise on the transfer screen.
      t.string :bank_name
      t.string :agency
      t.text :account_number

      # Who last wrote it. Money leaves on the strength of this record, so it has to be
      # attributable to somebody.
      t.references :updated_by, foreign_key: { to_table: :users }

      t.timestamps
    end

    add_index :teacher_bank_accounts, :teacher_id, unique: true,
              name: "index_teacher_bank_accounts_on_teacher"
  end
end
