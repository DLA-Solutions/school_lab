# frozen_string_literal: true

# Person involved in a minutes entry (BR-LA04): a snapshot, not a live view of the person. The
# optional links are informational only. `cpf` is LGPD-sensitive (BR-LA09).
class CreateMinutesParticipants < ActiveRecord::Migration[8.1]
  def change
    create_table :minutes_participants do |t|
      t.references :minutes_entry, null: false, foreign_key: true
      t.references :school, null: false, foreign_key: true
      t.references :membership, foreign_key: true
      t.references :guardian, foreign_key: true
      t.references :student, foreign_key: true
      t.string :name, null: false
      t.string :role_label
      t.string :email
      t.string :cpf
      t.boolean :signs, null: false, default: false
      t.datetime :signed_at

      t.timestamps
    end

    add_index :minutes_participants, %i[school_id name]
  end
end
