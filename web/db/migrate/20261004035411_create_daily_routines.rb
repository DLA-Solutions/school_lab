# frozen_string_literal: true

# The infantil day, one card per child per civil date. Sleep, meals, and a short narrative a
# family reads in the evening. Sent cards are kept — there is no discard — because a guardian
# has already seen them and how long that record must live is still open.
class CreateDailyRoutines < ActiveRecord::Migration[8.1]
  def change
    create_table :daily_routines do |t|
      t.references :school, null: false, foreign_key: true
      t.references :student, null: false, foreign_key: true
      # The class the child was in that day. Infantil-only is an application rule; storing the
      # class keeps yesterday's card stable if the child moves tomorrow.
      # DBML names this table `classes`; the physical table is `school_classes`.
      t.references :school_class, null: false, foreign_key: { to_table: :school_classes }
      t.date :date, null: false
      # Signed by a teacher, not by whichever membership happened to tap send.
      t.references :author, null: false, foreign_key: { to_table: :teachers }

      t.text :narrative
      t.string :sleep_morning
      t.string :sleep_after_lunch
      t.string :sleep_afternoon
      t.string :interaction
      t.string :evacuation
      t.string :discomfort
      # Health detail. The service requires it when discomfort is yes; it stays free text
      # because a family and a coordinator both need the prose later.
      t.text :discomfort_detail
      t.string :meal_breakfast
      t.string :meal_lunch
      t.string :meal_afternoon_snack
      t.string :meal_dinner
      t.string :meal_hydration

      t.string :status, null: false, default: "draft"
      t.datetime :sent_at

      t.timestamps
    end

    add_index :daily_routines, %i[school_id student_id date],
              unique: true,
              name: "index_daily_routines_on_school_student_date"
    add_index :daily_routines, %i[school_id school_class_id date]

    add_check_constraint :daily_routines,
                         "status IN ('draft', 'sent')",
                         name: "daily_routines_status"

    # Null means the field was left blank. A value outside the pair would be a bug the
    # guardian screen cannot render.
    add_check_constraint :daily_routines,
                         "sleep_morning IS NULL OR sleep_morning IN ('yes', 'no')",
                         name: "daily_routines_sleep_morning_values"
    add_check_constraint :daily_routines,
                         "sleep_after_lunch IS NULL OR sleep_after_lunch IN ('yes', 'no')",
                         name: "daily_routines_sleep_after_lunch_values"
    add_check_constraint :daily_routines,
                         "sleep_afternoon IS NULL OR sleep_afternoon IN ('yes', 'no')",
                         name: "daily_routines_sleep_afternoon_values"
    add_check_constraint :daily_routines,
                         "interaction IS NULL OR interaction IN ('yes', 'no')",
                         name: "daily_routines_interaction_values"
    add_check_constraint :daily_routines,
                         "evacuation IS NULL OR evacuation IN ('yes', 'no')",
                         name: "daily_routines_evacuation_values"
    add_check_constraint :daily_routines,
                         "discomfort IS NULL OR discomfort IN ('yes', 'no')",
                         name: "daily_routines_discomfort_values"

    add_check_constraint :daily_routines,
                         "meal_breakfast IS NULL OR meal_breakfast IN ('great', 'regular', 'refused')",
                         name: "daily_routines_meal_breakfast_values"
    add_check_constraint :daily_routines,
                         "meal_lunch IS NULL OR meal_lunch IN ('great', 'regular', 'refused')",
                         name: "daily_routines_meal_lunch_values"
    add_check_constraint :daily_routines,
                         "meal_afternoon_snack IS NULL OR meal_afternoon_snack IN ('great', 'regular', 'refused')",
                         name: "daily_routines_meal_afternoon_snack_values"
    add_check_constraint :daily_routines,
                         "meal_dinner IS NULL OR meal_dinner IN ('great', 'regular', 'refused')",
                         name: "daily_routines_meal_dinner_values"
    add_check_constraint :daily_routines,
                         "meal_hydration IS NULL OR meal_hydration IN ('great', 'regular', 'refused')",
                         name: "daily_routines_meal_hydration_values"
  end
end
