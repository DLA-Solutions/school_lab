# frozen_string_literal: true

class CreateReportCardPublishSchedules < ActiveRecord::Migration[8.1]
  def change
    create_table :report_card_publish_schedules do |t|
      t.references :school, null: false, foreign_key: true
      t.references :report_card_publish_batch, null: false, foreign_key: true, index: { unique: true }
      t.datetime :scheduled_for, null: false
      t.string :school_timezone, null: false
      t.string :status, null: false, default: "scheduled"
      t.string :queue_job_reference
      t.datetime :executed_at

      t.timestamps
    end
  end
end
