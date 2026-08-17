# frozen_string_literal: true

class CreateReportCardPublishBatches < ActiveRecord::Migration[8.1]
  def change
    create_table :report_card_publish_batches do |t|
      t.references :school, null: false, foreign_key: true
      t.references :school_class, null: false, foreign_key: { to_table: :school_classes }
      t.references :academic_period, null: false, foreign_key: true
      t.references :requested_by_membership, null: false, foreign_key: { to_table: :memberships }
      t.string :mode, null: false
      t.string :status, null: false, default: "processing"
      t.text :force_publish_reason
      t.integer :requested_count, null: false, default: 0
      t.integer :released_count, null: false, default: 0
      t.integer :failed_count, null: false, default: 0
      t.jsonb :blockers, null: false, default: []
      t.datetime :completed_at

      t.timestamps
    end

    add_index :report_card_publish_batches,
              %i[school_id school_class_id academic_period_id status],
              name: "index_rc_batches_on_school_class_period_status"
  end
end
