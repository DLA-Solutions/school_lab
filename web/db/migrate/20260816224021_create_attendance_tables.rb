# frozen_string_literal: true

class CreateAttendanceTables < ActiveRecord::Migration[8.1]
  def change
    create_table :attendance_policies do |t|
      t.references :school, null: false, foreign_key: true, index: { unique: true }
      t.string :counting_mode, null: false, default: "lesson"
      t.boolean :late_counts_as_absence, null: false, default: false
      t.integer :auto_confirm_absence_after_minutes, null: false, default: 15
      t.timestamps
    end

    add_check_constraint :attendance_policies,
                         "auto_confirm_absence_after_minutes > 0",
                         name: "attendance_policies_auto_confirm_positive"

    create_table :attendance_sessions do |t|
      t.references :school, null: false, foreign_key: true
      t.references :school_class, null: false, foreign_key: true
      t.references :school_year, null: false, foreign_key: true
      t.references :academic_period, foreign_key: true
      t.bigint :lesson_id
      t.date :session_date, null: false
      t.references :recorded_by_membership, foreign_key: { to_table: :memberships }
      t.datetime :confirmed_at
      t.datetime :discarded_at
      t.timestamps
    end

    add_index :attendance_sessions,
              %i[school_class_id session_date lesson_id],
              unique: true,
              where: "lesson_id IS NOT NULL AND discarded_at IS NULL",
              name: "index_attendance_sessions_on_class_date_lesson_kept"

    add_index :attendance_sessions,
              %i[school_class_id academic_period_id session_date],
              unique: true,
              where: "lesson_id IS NULL AND discarded_at IS NULL",
              name: "index_attendance_sessions_period_total_kept"

    create_table :attendance_records do |t|
      t.references :attendance_session, null: false, foreign_key: true
      t.references :school, null: false, foreign_key: true
      t.references :student, null: false, foreign_key: true
      t.string :status, null: false
      t.datetime :absence_notified_at
      t.datetime :discarded_at
      t.timestamps
    end

    add_index :attendance_records,
              %i[attendance_session_id student_id],
              unique: true,
              where: "discarded_at IS NULL",
              name: "index_attendance_records_on_session_student_kept"
  end
end
