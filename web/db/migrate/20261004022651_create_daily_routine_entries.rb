# frozen_string_literal: true

class CreateDailyRoutineEntries < ActiveRecord::Migration[8.1]
  def change
    create_table :daily_routine_entries do |t|
      t.references :school, null: false, foreign_key: true
      t.references :student, null: false, foreign_key: true
      t.date :date, null: false
      t.boolean :snack_eaten
      t.integer :poop_count, null: false, default: 0
      t.integer :pee_count, null: false, default: 0
      t.text :notes
      t.string :status, null: false, default: "draft"
      t.datetime :sent_at
      t.references :sent_by_membership, foreign_key: { to_table: :memberships }
      t.references :recorded_by_membership, foreign_key: { to_table: :memberships }

      t.timestamps
    end

    add_index :daily_routine_entries, %i[student_id date], unique: true,
              name: "index_daily_routine_entries_on_student_date"
  end
end
