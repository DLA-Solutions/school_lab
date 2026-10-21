# frozen_string_literal: true

# Yearly Livro Ata container (BR-LA01) — groups minutes entries and has no workflow of its own.
class CreateMinutesBooks < ActiveRecord::Migration[8.1]
  def change
    create_table :minutes_books do |t|
      t.references :school, null: false, foreign_key: true
      t.string :name, null: false
      t.integer :year, null: false
      t.references :created_by_membership, foreign_key: { to_table: :memberships }
      t.datetime :discarded_at

      t.timestamps
    end

    # Name is unique per school and year among kept books; a discarded book frees its name.
    add_index :minutes_books, %i[school_id year name],
              unique: true,
              where: "discarded_at IS NULL",
              name: "index_minutes_books_on_school_year_name_kept"
  end
end
