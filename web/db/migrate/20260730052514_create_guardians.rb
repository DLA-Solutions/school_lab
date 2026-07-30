# frozen_string_literal: true

class CreateGuardians < ActiveRecord::Migration[8.1]
  def change
    create_table :guardians do |t|
      t.references :school, null: false, foreign_key: true
      t.references :user, foreign_key: true
      t.string :name
      t.string :cpf
      t.string :email
      t.string :phone
      t.datetime :discarded_at
      t.references :discarded_by, foreign_key: { to_table: :users }

      t.timestamps
    end
  end
end
