# frozen_string_literal: true

class CreateReportCardSnapshots < ActiveRecord::Migration[8.1]
  def change
    create_table :report_card_snapshots do |t|
      t.references :school, null: false, foreign_key: true
      t.references :report_card_publication, null: false, foreign_key: true
      t.references :report_card_publish_batch, null: true, foreign_key: true
      t.references :report_card_config, null: false, foreign_key: true
      t.integer :version, null: false
      t.bigint :supersedes_id
      t.string :grade_launch_digest, null: false
      t.jsonb :snapshot, null: false
      t.text :correction_reason
      t.datetime :released_at, null: false
      t.string :pdf_storage_key, null: false

      t.timestamps
    end

    add_index :report_card_snapshots,
              %i[report_card_publication_id version],
              unique: true,
              name: "index_rc_snapshots_on_publication_version"
    add_foreign_key :report_card_snapshots, :report_card_snapshots, column: :supersedes_id
    add_foreign_key :report_card_publications, :report_card_snapshots, column: :active_snapshot_id
  end
end
