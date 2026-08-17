# frozen_string_literal: true

# Who may collect a child at the gate. The family names them from the portal, and the school reads
# the list at the moment somebody turns up asking for the student.
#
# Kept rather than deleted when withdrawn: who was authorised on a given day is exactly the
# question asked after something goes wrong, and a row that vanished cannot answer it.
class CreateAuthorizedPickups < ActiveRecord::Migration[8.1]
  def change
    create_table :authorized_pickups do |t|
      t.references :school, null: false, foreign_key: true
      t.references :student, null: false, foreign_key: true

      t.string :name, null: false
      # Bare digits, like every other document on the register.
      t.string :cpf, null: false
      t.string :phone

      # Who put them on the list. The family authorises; the record says which of them did.
      t.references :created_by, foreign_key: { to_table: :users }

      t.datetime :discarded_at

      t.timestamps
    end

    add_index :authorized_pickups, %i[student_id discarded_at]
    # The same person twice on one child's list is a data-entry slip, not two authorisations.
    add_index :authorized_pickups, %i[student_id cpf], unique: true, where: "discarded_at IS NULL",
              name: "index_authorized_pickups_on_student_and_cpf_kept"
  end
end
