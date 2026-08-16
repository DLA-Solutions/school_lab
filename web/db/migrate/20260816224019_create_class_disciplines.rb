# frozen_string_literal: true

class CreateClassDisciplines < ActiveRecord::Migration[8.1]
  def change
    create_table :class_disciplines do |t|
      t.references :school, null: false, foreign_key: true
      t.references :school_class, null: false, foreign_key: true
      t.references :subject, null: false, foreign_key: true
      t.references :school_year, null: false, foreign_key: true
      t.references :teacher, foreign_key: true

      t.boolean :required_on_report_card, null: false, default: true
      t.datetime :discarded_at
      t.timestamps
    end

    add_index :class_disciplines,
              %i[school_class_id subject_id],
              unique: true,
              where: "discarded_at IS NULL",
              name: "index_class_disciplines_on_class_subject_kept"
  end
end
