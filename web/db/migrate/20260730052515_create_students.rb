# frozen_string_literal: true

class CreateStudents < ActiveRecord::Migration[8.1]
  def change
    create_table :students do |t|
      t.references :school, null: false, foreign_key: true
      t.string :name
      t.date :birth_date
      t.string :status, null: false, default: "active"
      t.datetime :discarded_at
      t.references :discarded_by, foreign_key: { to_table: :users }

      t.timestamps
    end

    add_index :students, %i[school_id status]
  end
end
