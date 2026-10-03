# frozen_string_literal: true

class CreateLessonPlans < ActiveRecord::Migration[8.1]
  def change
    create_table :lesson_plans do |t|
      t.references :school, null: false, foreign_key: true
      t.references :class_discipline, null: false, foreign_key: true
      t.date :date, null: false
      t.text :content, null: false

      t.timestamps
    end

    add_index :lesson_plans, %i[class_discipline_id date], unique: true,
              name: "index_lesson_plans_on_class_discipline_date"
  end
end
