# frozen_string_literal: true

class CreatePlatformSchoolYearsW1 < ActiveRecord::Migration[8.1]
  def change
    enable_extension "btree_gist" unless extension_enabled?("btree_gist")

    create_table :school_years do |t|
      t.references :school, null: false, foreign_key: true
      t.string :name, null: false
      t.date :starts_on, null: false
      t.date :ends_on, null: false
      t.string :period_template, null: false, default: "trimester"
      t.string :status, null: false, default: "draft"
      t.datetime :discarded_at

      t.timestamps
    end

    add_check_constraint :school_years, "ends_on >= starts_on", name: "school_years_dates_valid"
    add_index :school_years,
              :school_id,
              unique: true,
              where: "status = 'active' AND discarded_at IS NULL",
              name: "index_school_years_one_active_per_school_kept"
    add_index :school_years, %i[school_id status]

    create_table :academic_periods do |t|
      t.references :school_year, null: false, foreign_key: true
      t.references :school, null: false, foreign_key: true
      t.string :name, null: false
      t.integer :sequence, null: false
      t.date :starts_on, null: false
      t.date :ends_on, null: false
      t.string :closure_status, null: false, default: "open"
      t.datetime :discarded_at

      t.timestamps
    end

    add_check_constraint :academic_periods, "ends_on >= starts_on", name: "academic_periods_dates_valid"
    add_index :academic_periods,
              %i[school_year_id sequence],
              unique: true,
              where: "discarded_at IS NULL",
              name: "index_academic_periods_on_year_sequence_kept"
    add_exclusion_constraint :academic_periods,
                             "school_year_id WITH =, daterange(starts_on, ends_on, '[]') WITH &&",
                             using: :gist,
                             where: "discarded_at IS NULL",
                             name: "academic_periods_no_overlap_kept"

    create_table :school_holidays do |t|
      t.references :school, null: false, foreign_key: true
      t.references :school_year, null: false, foreign_key: true
      t.date :date, null: false
      t.string :name, null: false
      t.boolean :applies_to_attendance, null: false, default: true
      t.datetime :discarded_at

      t.timestamps
    end

    add_index :school_holidays,
              %i[school_year_id date],
              unique: true,
              where: "discarded_at IS NULL",
              name: "index_school_holidays_on_year_date_kept"
  end
end
